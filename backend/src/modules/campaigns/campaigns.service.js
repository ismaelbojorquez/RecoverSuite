import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { connectMongo, isMongoConfigured } from '../../config/mongo.js';
import CampaignExport from '../../models/CampaignExport.js';
import ClienteScore from '../../models/ClienteScore.js';
import ContactHistory from '../../models/ContactHistory.js';
import { createJob, updateJob } from '../jobs/jobs.repository.js';
import { enqueueJob } from '../../queues/main.queue.js';
import { createHttpError } from '../../utils/http-error.js';
import { CONTACT_CHANNELS, normalizeChannel } from '../dictamenes/dictamenes.constants.js';
import { listEligibleCampaignClients } from './campaigns.repository.js';
import { resolveDecisionClientId } from '../../services/decisionIdentity.service.js';
import {
  analyzeContactHistory,
  resolverSiguienteAccion
} from '../../services/strategyEngine.js';
import { resolverSiguientePasoPlaybook } from '../../services/playbookService.js';
import { generarArchivo, resolveCampaignUploadsDir } from '../../utils/xlsxGenerator.js';

const CAMPAIGN_JOB_TYPE = 'campaign_export';
const DEFAULT_EXPORT_LIMIT = 2000;
const MAX_EXPORT_LIMIT = 10000;
const DEFAULT_HISTORY_WINDOW_DAYS = 7;
const MAX_HISTORY_WINDOW_DAYS = 30;
const DEFAULT_DEBT_THRESHOLD = 5000;
const MONGO_BATCH_SIZE = 500;
const PRIORITY_RANK = Object.freeze({
  ALTA: 0,
  MEDIA: 1,
  BAJA: 2
});
const CHANNEL_SCORE_KEY_MAP = Object.freeze({
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VISITA: 'visita'
});

const normalizeText = (value) => String(value || '').trim();

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const chunkArray = (values, chunkSize) => {
  const chunks = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
};

const sanitizeFileSegment = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'campaign';

const toIsoStringOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildDateDaysAgo = (value, days) => {
  const baseDate = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  baseDate.setDate(baseDate.getDate() - days);
  return baseDate;
};

const ensureCampaignEngineAvailable = () => {
  if (!isMongoConfigured()) {
    throw createHttpError(503, 'Campaign Engine requiere Mongo configurado.');
  }
};

const resolveAbsoluteCampaignPath = (relativePath) =>
  path.resolve(resolveCampaignUploadsDir(), relativePath);

const buildCampaignDisplayName = (row = {}) =>
  [row.nombre, row.apellido_paterno, row.apellido_materno]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ');

export const formatCampaignAddress = (row = {}) =>
  [
    row.linea1,
    row.linea2,
    row.ciudad,
    row.estado,
    row.codigo_postal,
    row.pais
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(', ');

export const resolveCampaignContactAvailability = (row = {}) => {
  const hasPhone = Boolean(normalizeText(row.telefono));
  const hasEmail = Boolean(normalizeText(row.email));
  const hasAddress = Boolean(formatCampaignAddress(row));

  return {
    LLAMADA: hasPhone,
    WHATSAPP: hasPhone,
    SMS: hasPhone,
    EMAIL: hasEmail,
    VISITA: hasAddress
  };
};

const resolveCampaignContactValue = (row = {}, channel) => {
  switch (channel) {
    case 'LLAMADA':
    case 'WHATSAPP':
    case 'SMS':
      return normalizeText(row.telefono) || null;
    case 'EMAIL':
      return normalizeText(row.email) || null;
    case 'VISITA':
      return formatCampaignAddress(row) || null;
    default:
      return null;
  }
};

const buildSqlClienteScoreFallback = (row = {}) => ({
  scoreGeneral: toFiniteNumber(row.scoring_global),
  riesgo: normalizeText(row.scoring_riesgo_nivel) || undefined,
  canales: {
    llamada: toFiniteNumber(row.scoring_llamada),
    whatsapp: toFiniteNumber(row.scoring_whatsapp),
    sms: toFiniteNumber(row.scoring_sms),
    email: toFiniteNumber(row.scoring_email),
    visita: toFiniteNumber(row.scoring_visita)
  },
  estrategia: {
    shouldStopContact: row.strategy_should_stop_contact === true,
    shouldEscalateVisit: row.strategy_should_escalate_visit === true,
    visitEligible: row.strategy_visit_eligible === true,
    sequenceStep: toFiniteNumber(row.strategy_sequence_step),
    contactPlan: {
      availabilityByChannel: resolveCampaignContactAvailability(row)
    }
  }
});

export const buildCampaignDecisionScoreInput = (row = {}, mongoScore = null) => {
  const fallback = buildSqlClienteScoreFallback(row);
  const availabilityByChannel = resolveCampaignContactAvailability(row);
  const baseCanales = fallback.canales || {};
  const mongoCanales =
    mongoScore?.canales && typeof mongoScore.canales === 'object' ? mongoScore.canales : {};
  const mongoEstrategia =
    mongoScore?.estrategia && typeof mongoScore.estrategia === 'object'
      ? { ...mongoScore.estrategia }
      : {};
  const sourceContactPlan =
    mongoEstrategia.contactPlan && typeof mongoEstrategia.contactPlan === 'object'
      ? mongoEstrategia.contactPlan
      : mongoEstrategia.contact_plan && typeof mongoEstrategia.contact_plan === 'object'
        ? mongoEstrategia.contact_plan
        : {};

  return {
    ...fallback,
    ...(mongoScore && typeof mongoScore === 'object' ? mongoScore : {}),
    scoreGeneral:
      toFiniteNumber(mongoScore?.scoreGeneral) ??
      toFiniteNumber(mongoScore?.score_general) ??
      fallback.scoreGeneral,
    canales: {
      ...baseCanales,
      ...mongoCanales
    },
    estrategia: {
      ...fallback.estrategia,
      ...mongoEstrategia,
      contactPlan: {
        ...sourceContactPlan,
        availabilityByChannel: {
          ...(sourceContactPlan?.availabilityByChannel || {}),
          ...(sourceContactPlan?.availability_by_channel || {}),
          ...availabilityByChannel
        }
      }
    }
  };
};

const resolveChannelScore = (clienteScore = {}, channel) => {
  const channelKey = CHANNEL_SCORE_KEY_MAP[channel];
  const channelScore = toFiniteNumber(clienteScore?.canales?.[channelKey]);
  return channelScore ?? toFiniteNumber(clienteScore?.scoreGeneral) ?? null;
};

export const buildCampaignTargetRecord = ({
  baseRow = {},
  decision = {},
  clienteScore = null,
  historyAnalysis = null,
  playbookStep = null
}) => {
  const safeHistory = historyAnalysis || analyzeContactHistory([]);
  const recommendedChannel = decision?.canal || null;
  const channelStats = recommendedChannel
    ? safeHistory?.stats?.[recommendedChannel] || {}
    : {};
  const scoreGeneral =
    toFiniteNumber(clienteScore?.scoreGeneral) ??
    toFiniteNumber(clienteScore?.score_general) ??
    toFiniteNumber(baseRow.scoring_global);
  const riskLevel =
    normalizeText(clienteScore?.riesgo) ||
    normalizeText(clienteScore?.risk) ||
    normalizeText(baseRow.scoring_riesgo_nivel) ||
    null;

  return {
    cliente_id: baseRow.client_id,
    numero_cliente: baseRow.numero_cliente || null,
    nombre_completo: buildCampaignDisplayName(baseRow) || null,
    portafolio_id: baseRow.portafolio_id,
    accion: decision?.accion || null,
    canal_recomendado: recommendedChannel,
    prioridad: decision?.prioridad || null,
    razon: decision?.razon || null,
    dato_contacto: resolveCampaignContactValue(baseRow, recommendedChannel),
    telefono: normalizeText(baseRow.telefono) || null,
    email: normalizeText(baseRow.email) || null,
    direccion: formatCampaignAddress(baseRow) || null,
    creditos: normalizeText(baseRow.credit_numbers) || null,
    cantidad_creditos: parseInteger(baseRow.credit_count) ?? 0,
    score_general: scoreGeneral,
    score_canal: resolveChannelScore(clienteScore, recommendedChannel),
    riesgo: riskLevel,
    score_llamada:
      toFiniteNumber(clienteScore?.canales?.llamada) ?? toFiniteNumber(baseRow.scoring_llamada),
    score_whatsapp:
      toFiniteNumber(clienteScore?.canales?.whatsapp) ??
      toFiniteNumber(baseRow.scoring_whatsapp),
    score_sms:
      toFiniteNumber(clienteScore?.canales?.sms) ?? toFiniteNumber(baseRow.scoring_sms),
    score_email:
      toFiniteNumber(clienteScore?.canales?.email) ?? toFiniteNumber(baseRow.scoring_email),
    score_visita:
      toFiniteNumber(clienteScore?.canales?.visita) ?? toFiniteNumber(baseRow.scoring_visita),
    monto_deuda:
      toFiniteNumber(clienteScore?.montoDeuda) ??
      toFiniteNumber(clienteScore?.monto_deuda) ??
      null,
    intentos_7d: safeHistory?.totalAttempts || 0,
    fallos_7d: safeHistory?.totalFailures || 0,
    exitos_7d: safeHistory?.totalSuccesses || 0,
    ultimo_intento_at: safeHistory?.orderedRows?.[0]?.fecha
      ? toIsoStringOrNull(safeHistory.orderedRows[0].fecha)
      : null,
    intentos_canal_7d: channelStats?.attempts || 0,
    fallos_canal_7d: channelStats?.failAttempts || 0,
    exitos_canal_7d: channelStats?.successAttempts || 0,
    playbook_paso: toFiniteNumber(playbookStep?.paso),
    playbook_dia: toFiniteNumber(playbookStep?.dia),
    playbook_accion: playbookStep?.accion || null,
    playbook_due: playbookStep?.due === true,
    score_actualizado_at:
      toIsoStringOrNull(clienteScore?.ultimaActualizacion) ||
      toIsoStringOrNull(clienteScore?.ultima_actualizacion) ||
      toIsoStringOrNull(baseRow.scoring_actualizado_at)
  };
};

export const groupCampaignRecordsByChannel = (records = [], requestedChannels = undefined) => {
  const requestedSet =
    Array.isArray(requestedChannels) && requestedChannels.length > 0
      ? new Set(requestedChannels)
      : null;

  const grouped = {};

  for (const record of Array.isArray(records) ? records : []) {
    const channel = normalizeChannel(record?.canal_recomendado);
    if (!channel) {
      continue;
    }

    if (requestedSet && !requestedSet.has(channel)) {
      continue;
    }

    if (!grouped[channel]) {
      grouped[channel] = [];
    }

    grouped[channel].push(record);
  }

  for (const channel of Object.keys(grouped)) {
    grouped[channel].sort((left, right) => {
      const leftPriority = PRIORITY_RANK[left.prioridad] ?? 999;
      const rightPriority = PRIORITY_RANK[right.prioridad] ?? 999;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return (right.score_general || 0) - (left.score_general || 0);
    });
  }

  return grouped;
};

const buildChannelFileRows = (records = []) =>
  records.map((record) => ({
    nombre: record?.nombre_completo ?? null,
    clienteId: record?.cliente_id ?? null,
    telefono: record?.telefono ?? record?.dato_contacto ?? null,
    email: record?.email ?? null,
    direccion: record?.direccion ?? null,
    scoreGeneral: record?.score_general ?? null,
    riesgo: record?.riesgo ?? null,
    canalRecomendado: record?.canal_recomendado ?? null,
    razon: record?.razon ?? null
  }));

const writeCampaignWorkbookFile = async ({
  exportId,
  portafolioId,
  channel,
  records,
  generatedAt
}) => {
  const safeChannel = normalizeChannel(channel);
  if (!safeChannel) {
    throw createHttpError(400, 'Canal de campaña invalido.');
  }

  const timestamp =
    toIsoStringOrNull(generatedAt)?.replace(/[-:.]/g, '').replace('T', '_').replace('Z', '') ||
    Date.now().toString();
  const fileBaseName = `campaign_${sanitizeFileSegment(portafolioId)}_${safeChannel}_${timestamp}`;
  const absolutePath = await generarArchivo(
    path.join(exportId, fileBaseName),
    buildChannelFileRows(records)
  );
  const relativePath = path.relative(resolveCampaignUploadsDir(), absolutePath);
  const [fileStats, fileBuffer] = await Promise.all([
    fs.stat(absolutePath),
    fs.readFile(absolutePath)
  ]);

  return {
    channel: safeChannel,
    fileName: path.basename(absolutePath),
    relativePath,
    sizeBytes: fileStats.size,
    recordCount: records.length,
    checksum: crypto.createHash('sha1').update(fileBuffer).digest('hex')
  };
};

const writeCampaignManifestFile = async ({ exportId, payload }) => {
  const relativePath = path.join(exportId, 'manifest.json');
  const absolutePath = resolveAbsoluteCampaignPath(relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, JSON.stringify(payload, null, 2), 'utf8');

  return relativePath;
};

const buildCampaignManifestPayload = ({
  exportRecord,
  summary,
  files,
  generatedAt
}) => ({
  export_id: exportRecord.id || exportRecord._id?.toString() || null,
  job_id: exportRecord.jobId ?? exportRecord.job_id ?? null,
  portafolio_id: exportRecord.portafolioId ?? exportRecord.portafolio_id ?? null,
  status: exportRecord.status,
  filters: exportRecord.filters || {},
  summary,
  files,
  generated_at: toIsoStringOrNull(generatedAt)
});

const resolveRequestedChannels = (value) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = values
    .map((channel) => normalizeChannel(channel))
    .filter(Boolean);

  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
};

export const resolveCampaignFilters = (input = {}) => {
  const limit = parseInteger(input.limit);
  const debtThreshold = toFiniteNumber(input.debtThreshold ?? input.debt_threshold);
  const historyWindowDays = parseInteger(
    input.historyWindowDays ?? input.history_window_days
  );
  const channels = resolveRequestedChannels(input.channels);

  return {
    channels,
    limit:
      limit && limit > 0
        ? Math.min(limit, MAX_EXPORT_LIMIT)
        : DEFAULT_EXPORT_LIMIT,
    debtThreshold:
      Number.isFinite(debtThreshold) && debtThreshold >= 0
        ? debtThreshold
        : DEFAULT_DEBT_THRESHOLD,
    historyWindowDays:
      historyWindowDays && historyWindowDays > 0
        ? Math.min(historyWindowDays, MAX_HISTORY_WINDOW_DAYS)
        : DEFAULT_HISTORY_WINDOW_DAYS
  };
};

const updateCampaignJobState = async (jobId, updates = {}) => {
  if (!jobId) {
    return null;
  }

  return updateJob(jobId, updates);
};

const loadCampaignStrategyData = async (baseRows = [], { historyWindowDays, now }) => {
  await connectMongo();

  const rowsWithDecisionIds = baseRows.map((row) => ({
    ...row,
    decision_client_id: resolveDecisionClientId(row.client_id)
  }));
  const scoreByDecisionId = new Map();
  const historyByDecisionId = new Map();
  const historySince = buildDateDaysAgo(now, historyWindowDays);

  for (const chunk of chunkArray(rowsWithDecisionIds, MONGO_BATCH_SIZE)) {
    const decisionIds = chunk.map((row) => row.decision_client_id);

    const [scores, histories] = await Promise.all([
      ClienteScore.find({ clienteId: { $in: decisionIds } })
        .select({
          clienteId: 1,
          scoreGeneral: 1,
          canales: 1,
          riesgo: 1,
          montoDeuda: 1,
          estrategia: 1,
          ultimaActualizacion: 1
        })
        .lean(),
      ContactHistory.find({
        clienteId: { $in: decisionIds },
        fecha: { $gte: historySince }
      })
        .select({
          clienteId: 1,
          canal: 1,
          fecha: 1,
          resultado: 1,
          dictamenId: 1
        })
        .sort({ clienteId: 1, fecha: -1, _id: -1 })
        .lean()
    ]);

    for (const score of scores) {
      scoreByDecisionId.set(String(score.clienteId), score);
    }

    for (const historyEntry of histories) {
      const key = String(historyEntry.clienteId);
      if (!historyByDecisionId.has(key)) {
        historyByDecisionId.set(key, []);
      }

      historyByDecisionId.get(key).push(historyEntry);
    }
  }

  return {
    rowsWithDecisionIds,
    scoreByDecisionId,
    historyByDecisionId
  };
};

const buildCampaignRecommendationSet = async (baseRows = [], filters = {}) => {
  const now = filters.now instanceof Date ? filters.now : new Date();
  const { rowsWithDecisionIds, scoreByDecisionId, historyByDecisionId } =
    await loadCampaignStrategyData(baseRows, {
      historyWindowDays: filters.historyWindowDays,
      now
    });

  const records = [];
  const skipCounters = {
    detener: 0,
    channelFilter: 0,
    missingContactData: 0
  };

  for (const row of rowsWithDecisionIds) {
    const decisionKey = String(row.decision_client_id);
    const historyRows = historyByDecisionId.get(decisionKey) || [];
    const clienteScore = buildCampaignDecisionScoreInput(
      row,
      scoreByDecisionId.get(decisionKey) || null
    );
    const decision = resolverSiguienteAccion({
      clienteScore,
      contactHistory: historyRows,
      debtThreshold: filters.debtThreshold,
      now
    });

    if (!decision || decision.accion === 'DETENER') {
      skipCounters.detener += 1;
      continue;
    }

    if (Array.isArray(filters.channels) && filters.channels.length > 0) {
      const normalizedChannel = normalizeChannel(decision.canal);
      if (!normalizedChannel || !filters.channels.includes(normalizedChannel)) {
        skipCounters.channelFilter += 1;
        continue;
      }
    }

    const contactValue = resolveCampaignContactValue(row, decision.canal);
    if (!contactValue) {
      skipCounters.missingContactData += 1;
      continue;
    }

    const historyAnalysis = analyzeContactHistory(historyRows);
    const playbookStep = resolverSiguientePasoPlaybook({
      contactHistory: historyRows,
      now
    });

    records.push(
      buildCampaignTargetRecord({
        baseRow: row,
        decision,
        clienteScore,
        historyAnalysis,
        playbookStep
      })
    );
  }

  const groupedRecords = groupCampaignRecordsByChannel(records, filters.channels);
  const summaryByChannel = Object.fromEntries(
    CONTACT_CHANNELS.map((channel) => [channel, groupedRecords[channel]?.length || 0])
  );

  return {
    groupedRecords,
    records,
    summary: {
      totalClients: baseRows.length,
      totalEligible: records.length,
      totalSkipped:
        skipCounters.detener +
        skipCounters.channelFilter +
        skipCounters.missingContactData,
      totalFiles: Object.values(groupedRecords).filter((channelRows) => channelRows.length > 0)
        .length,
      byChannel: summaryByChannel,
      skipped: skipCounters
    }
  };
};

export const createCampaignExportRequest = async ({
  portafolioId,
  userId,
  filters = {}
}) => {
  ensureCampaignEngineAvailable();

  const resolvedPortafolioId = parseInteger(portafolioId);
  const resolvedUserId = parseInteger(userId);

  if (!resolvedPortafolioId) {
    throw createHttpError(400, 'portafolio_id es obligatorio.');
  }

  if (!resolvedUserId) {
    throw createHttpError(401, 'Usuario no autenticado.');
  }

  const resolvedFilters = resolveCampaignFilters(filters);
  const payloadResumen = JSON.stringify({
    tipo: CAMPAIGN_JOB_TYPE,
    portafolio_id: resolvedPortafolioId,
    filters: resolvedFilters
  });

  const jobRecord = await createJob({
    tipo: CAMPAIGN_JOB_TYPE,
    usuarioId: resolvedUserId,
    portafolioId: resolvedPortafolioId,
    payloadResumen
  });

  try {
    await connectMongo();

    const exportRecord = await CampaignExport.create({
      jobId: jobRecord.id,
      portafolioId: resolvedPortafolioId,
      createdBy: resolvedUserId,
      status: 'PENDIENTE',
      filters: resolvedFilters,
      summary: {
        totalClients: 0,
        totalEligible: 0,
        totalSkipped: 0,
        totalFiles: 0,
        byChannel: {}
      }
    });

    try {
      await enqueueJob(
        CAMPAIGN_JOB_TYPE,
        {
          exportId: String(exportRecord._id),
          jobId: jobRecord.id,
          userId: resolvedUserId,
          portafolioId: resolvedPortafolioId,
          filters: resolvedFilters
        },
        {
          jobId: `${CAMPAIGN_JOB_TYPE}:${String(exportRecord._id)}`
        }
      );
    } catch (err) {
      await Promise.allSettled([
        updateCampaignJobState(jobRecord.id, {
          estado: 'error',
          error: 'No se pudo encolar la exportacion de campana',
          finishedAt: new Date()
        }),
        CampaignExport.findByIdAndUpdate(exportRecord._id, {
          $set: {
            status: 'ERROR',
            error: 'No se pudo encolar la exportacion de campana',
            finishedAt: new Date()
          }
        })
      ]);

      throw createHttpError(503, 'No se pudo encolar la exportacion de campana.');
    }

    return {
      exportRecord: exportRecord.toObject(),
      jobRecord
    };
  } catch (err) {
    await updateCampaignJobState(jobRecord.id, {
      estado: 'error',
      error: err.message || 'No se pudo crear la exportacion de campana',
      finishedAt: new Date()
    }).catch(() => null);

    throw err;
  }
};

export const listCampaignExports = async ({
  portafolioId,
  status,
  limit = 20,
  offset = 0
} = {}) => {
  ensureCampaignEngineAvailable();
  await connectMongo();

  const safeLimit = Math.min(parseInteger(limit) || 20, 100);
  const safeOffset = Math.max(parseInteger(offset) || 0, 0);
  const filter = {};
  const parsedPortafolioId = parseInteger(portafolioId);

  if (parsedPortafolioId) {
    filter.portafolioId = parsedPortafolioId;
  }

  if (status) {
    filter.status = normalizeText(status).toUpperCase();
  }

  return CampaignExport.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(safeOffset)
    .limit(safeLimit)
    .lean();
};

export const getCampaignExportById = async (exportId) => {
  ensureCampaignEngineAvailable();
  await connectMongo();

  const exportRecord = await CampaignExport.findById(exportId).lean();
  if (!exportRecord) {
    throw createHttpError(404, 'Exportacion de campana no encontrada.');
  }

  return exportRecord;
};

export const getCampaignFileDescriptor = async (exportId, channel) => {
  const exportRecord = await getCampaignExportById(exportId);
  const normalizedChannel = normalizeChannel(channel);

  if (!normalizedChannel) {
    throw createHttpError(400, 'Canal invalido.');
  }

  if (exportRecord.status !== 'COMPLETADO') {
    throw createHttpError(409, 'La exportacion de campana no esta lista.');
  }

  const fileRecord = Array.isArray(exportRecord.files)
    ? exportRecord.files.find((file) => file.channel === normalizedChannel)
    : null;

  if (!fileRecord) {
    throw createHttpError(404, 'Archivo de campana no encontrado para el canal solicitado.');
  }

  const absolutePath = resolveAbsoluteCampaignPath(fileRecord.relativePath);
  try {
    await fs.access(absolutePath);
  } catch {
    throw createHttpError(404, 'Archivo de campana no encontrado para el canal solicitado.');
  }

  return {
    exportRecord,
    fileRecord,
    absolutePath
  };
};

export const processCampaignExport = async ({
  exportId,
  jobId,
  portafolioId,
  userId,
  filters = {},
  now = new Date()
}) => {
  ensureCampaignEngineAvailable();
  await connectMongo();

  const exportRecord = await CampaignExport.findById(exportId);
  if (!exportRecord) {
    throw createHttpError(404, 'Exportacion de campana no encontrada.');
  }

  const generatedAt = now instanceof Date ? now : new Date(now || Date.now());
  const resolvedFilters = resolveCampaignFilters(filters);

  await Promise.all([
    CampaignExport.findByIdAndUpdate(exportId, {
      $set: {
        status: 'PROCESANDO',
        startedAt: generatedAt,
        finishedAt: undefined,
        error: undefined,
        files: []
      }
    }),
    updateCampaignJobState(jobId, {
      estado: 'procesando',
      progreso: 10,
      error: null
    })
  ]);

  try {
    const baseRows = await listEligibleCampaignClients({
      portafolioId: parseInteger(portafolioId),
      limit: resolvedFilters.limit,
      offset: 0
    });

    await updateCampaignJobState(jobId, { progreso: 35 });

    const recommendationSet = await buildCampaignRecommendationSet(baseRows, {
      ...resolvedFilters,
      now: generatedAt
    });

    await updateCampaignJobState(jobId, { progreso: 70 });

    const exportDir = path.join(String(exportId));
    const files = [];

    for (const channel of CONTACT_CHANNELS) {
      const channelRecords = recommendationSet.groupedRecords[channel] || [];
      if (!channelRecords.length) {
        continue;
      }

      files.push(
        await writeCampaignWorkbookFile({
          exportId: exportDir,
          portafolioId,
          channel,
          records: channelRecords,
          generatedAt
        })
      );
    }

    const manifestPayload = buildCampaignManifestPayload({
      exportRecord: {
        id: exportId,
        jobId,
        portafolioId,
        status: 'COMPLETADO',
        filters: resolvedFilters
      },
      summary: recommendationSet.summary,
      files,
      generatedAt
    });
    const manifestPath = await writeCampaignManifestFile({
      exportId: exportDir,
      payload: manifestPayload
    });

    const completedSummary = {
      totalClients: recommendationSet.summary.totalClients,
      totalEligible: recommendationSet.summary.totalEligible,
      totalSkipped: recommendationSet.summary.totalSkipped,
      totalFiles: files.length,
      byChannel: recommendationSet.summary.byChannel
    };

    const updatedExport = await CampaignExport.findByIdAndUpdate(
      exportId,
      {
        $set: {
          jobId: parseInteger(jobId),
          portafolioId: parseInteger(portafolioId),
          status: 'COMPLETADO',
          filters: resolvedFilters,
          summary: completedSummary,
          files,
          exportDir,
          manifestPath,
          startedAt: exportRecord.startedAt || generatedAt,
          finishedAt: new Date(),
          error: undefined
        }
      },
      {
        new: true
      }
    ).lean();

    await updateCampaignJobState(jobId, {
      estado: 'completado',
      progreso: 100,
      payloadResumen: JSON.stringify({
        tipo: CAMPAIGN_JOB_TYPE,
        portafolio_id: parseInteger(portafolioId),
        filters: resolvedFilters,
        summary: completedSummary
      }),
      finishedAt: new Date(),
      error: null
    });

    return updatedExport;
  } catch (err) {
    await Promise.allSettled([
      CampaignExport.findByIdAndUpdate(exportId, {
        $set: {
          status: 'ERROR',
          error: err.message || 'Error al generar la campana',
          finishedAt: new Date()
        }
      }),
      updateCampaignJobState(jobId, {
        estado: 'error',
        error: err.message || 'Error al generar la campana',
        finishedAt: new Date()
      })
    ]);

    throw err;
  }
};

export default {
  createCampaignExportRequest,
  listCampaignExports,
  getCampaignExportById,
  getCampaignFileDescriptor,
  processCampaignExport,
  resolveCampaignFilters,
  resolveCampaignContactAvailability,
  buildCampaignDecisionScoreInput,
  buildCampaignTargetRecord,
  groupCampaignRecordsByChannel,
  formatCampaignAddress
};
