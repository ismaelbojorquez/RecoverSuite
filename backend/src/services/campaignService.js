import path from 'path';
import fs from 'fs/promises';
import { connectMongo, isMongoConfigured } from '../config/mongo.js';
import Campaign from '../models/Campaign.js';
import ClienteScore from '../models/ClienteScore.js';
import ContactHistory from '../models/ContactHistory.js';
import { createHttpError } from '../utils/http-error.js';
import { normalizeChannel, normalizeRiskLevel } from '../modules/dictamenes/dictamenes.constants.js';
import { listEligibleCampaignClients } from '../modules/campaigns/campaigns.repository.js';
import {
  buildCampaignDecisionScoreInput,
  formatCampaignAddress
} from '../modules/campaigns/campaigns.service.js';
import { calcularSiguienteAccion, resolverSiguienteAccion } from './strategyEngine.js';
import { resolveDecisionClientId, resolveDecisionUserId } from './decisionIdentity.service.js';
import { createCampaignWorkbookWriter, generarArchivo } from '../utils/xlsxGenerator.js';

const CAMPAIGN_CHANNEL_KEYS = Object.freeze({
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VISITA: 'visita'
});

const DEFAULT_CONCURRENCY = 20;
const DEFAULT_CAMPAIGN_BATCH_SIZE = 1000;
const MAX_CAMPAIGN_BATCH_SIZE = 5000;
const DEFAULT_HISTORY_WINDOW_DAYS = 7;
const CAMPAIGN_SYSTEM_USER = 'campaign-engine-system';
const CAMPAIGN_CHANNEL_ORDER = Object.freeze(['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA']);
const CAMPAIGN_SINGLE_CHANNEL_PRIORITY = Object.freeze([
  'VISITA',
  'LLAMADA',
  'WHATSAPP',
  'SMS',
  'EMAIL'
]);
const CAMPAIGN_SINGLE_CHANNEL_PRIORITY_INDEX = Object.freeze(
  CAMPAIGN_SINGLE_CHANNEL_PRIORITY.reduce((accumulator, channel, index) => {
    accumulator[channel] = index;
    return accumulator;
  }, {})
);

const normalizeText = (value) => String(value || '').trim();

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['true', 't', '1', 'yes', 'si', 'sí'].includes(normalized)) {
    return true;
  }

  if (['false', 'f', '0', 'no'].includes(normalized)) {
    return false;
  }

  return null;
};

const buildEmptyCampaignGroups = () => ({
  llamada: [],
  whatsapp: [],
  sms: [],
  email: [],
  visita: []
});

const cloneGroupedCampaigns = (grouped = {}) => ({
  llamada: Array.isArray(grouped.llamada) ? grouped.llamada : [],
  whatsapp: Array.isArray(grouped.whatsapp) ? grouped.whatsapp : [],
  sms: Array.isArray(grouped.sms) ? grouped.sms : [],
  email: Array.isArray(grouped.email) ? grouped.email : [],
  visita: Array.isArray(grouped.visita) ? grouped.visita : []
});

const sanitizeFileSegment = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'campaign';

const formatTimestampSegment = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .replace('Z', '');
};

const resolveRequestedChannels = (channels) => {
  const values = Array.isArray(channels)
    ? channels
    : typeof channels === 'string'
      ? channels.split(',')
      : [];

  const normalized = values.map((value) => normalizeChannel(value)).filter(Boolean);

  return normalized.length > 0
    ? new Set(normalized)
    : new Set(Object.keys(CAMPAIGN_CHANNEL_KEYS));
};

const resolvePhoneList = (row = {}) => {
  const values = Array.isArray(row.telefonos) ? row.telefonos : row.telefono ? [row.telefono] : [];

  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean))
  );
};

const resolveEmailList = (row = {}) => {
  const values = Array.isArray(row.emails) ? row.emails : row.email ? [row.email] : [];

  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean))
  );
};

const buildClientDisplayName = (row = {}) =>
  [row.nombre, row.apellido_paterno, row.apellido_materno]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ');

const resolveCampaignClientIdentifiers = (row = {}) =>
  Array.from(
    new Set(
      [row.client_id, row.client_internal_id, row.id]
        .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
        .filter(Boolean)
    )
  );

const buildClientIdentifierKeys = (value) => {
  const keys = new Set();
  const rawValue =
    value === undefined || value === null ? '' : String(value).trim();

  if (rawValue) {
    keys.add(rawValue);
  }

  try {
    keys.add(resolveDecisionClientId(value).toString());
  } catch {
    // Ignore non-resolvable identifiers so callers can mix raw ids and ObjectIds.
  }

  return keys;
};

const buildClientMatchSet = (values = []) => {
  const matchSet = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    for (const key of buildClientIdentifierKeys(value)) {
      matchSet.add(key);
    }
  }

  return matchSet;
};

const resolveRowClientMatchKeys = (row = {}) =>
  buildClientMatchSet(resolveCampaignClientIdentifiers(row));

const resolvePrimaryClientIdentifier = (row = {}) =>
  resolveCampaignClientIdentifiers(row)[0] || null;

const isClientBlocked = (row = {}) => {
  const blocked = normalizeBoolean(row.scoring_bloquear_cliente ?? row.bloquear_cliente);
  const permitContact = normalizeBoolean(
    row.scoring_permitir_contacto ?? row.permitir_contacto
  );
  const shouldStop = normalizeBoolean(
    row.strategy_should_stop_contact ?? row.should_stop_contact
  );

  return blocked === true || permitContact === false || shouldStop === true;
};

const hasContactDataForChannel = ({ channel, telefonos, emails, direccion }) => {
  switch (channel) {
    case 'LLAMADA':
    case 'WHATSAPP':
    case 'SMS':
      return telefonos.length > 0;
    case 'EMAIL':
      return emails.length > 0;
    case 'VISITA':
      return Boolean(direccion);
    default:
      return false;
  }
};

const mapCampaignRecord = (row, decision) => {
  const normalizedChannel = normalizeChannel(decision?.canal);
  if (!normalizedChannel) {
    return null;
  }

  const telefonos = resolvePhoneList(row);
  const emails = resolveEmailList(row);
  const direccion = formatCampaignAddress(row) || null;

  if (!hasContactDataForChannel({ channel: normalizedChannel, telefonos, emails, direccion })) {
    return null;
  }

  const normalizedScore = buildCampaignDecisionScoreInput(row);

  return {
    clienteId: row.client_id,
    nombre: buildClientDisplayName(row) || null,
    telefonos,
    emails,
    direccion,
    scoreGeneral: normalizedScore.scoreGeneral ?? null,
    riesgo: normalizedScore.riesgo ?? null,
    canalRecomendado: normalizedChannel,
    razon: decision?.razon || null
  };
};

const resolveCampaignDayWindow = (value = new Date()) => {
  const baseDate = value instanceof Date ? value : new Date(value || Date.now());

  if (Number.isNaN(baseDate.getTime())) {
    throw createHttpError(400, 'fecha de campaña es inválida.');
  }

  const start = new Date(baseDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

const loadClientsContactedToday = async (rows = [], dependencies = {}) => {
  const uniqueIdentifiers = Array.from(
    new Set(rows.flatMap((row) => resolveCampaignClientIdentifiers(row)))
  );

  if (uniqueIdentifiers.length === 0) {
    return new Set();
  }

  if (typeof dependencies.listClientsContactedToday === 'function') {
    return buildClientMatchSet(
      await dependencies.listClientsContactedToday({
        rows,
        clientIdentifiers: uniqueIdentifiers,
        dayWindow: resolveCampaignDayWindow(dependencies.now),
        now: dependencies.now instanceof Date ? dependencies.now : new Date(dependencies.now || Date.now())
      })
    );
  }

  const ContactHistoryModel = dependencies.ContactHistoryModel || ContactHistory;
  const { start, end } = resolveCampaignDayWindow(dependencies.now);
  const resolvedClientIds = uniqueIdentifiers.map((identifier) =>
    resolveDecisionClientId(identifier)
  );

  if (ContactHistoryModel === ContactHistory) {
    await connectMongo();
  }

  if (typeof ContactHistoryModel.distinct === 'function') {
    const contactedIds = await ContactHistoryModel.distinct('clienteId', {
      clienteId: { $in: resolvedClientIds },
      fecha: { $gte: start, $lt: end }
    });

    return buildClientMatchSet(contactedIds);
  }

  if (typeof ContactHistoryModel.find === 'function') {
    const records = await ContactHistoryModel.find({
      clienteId: { $in: resolvedClientIds },
      fecha: { $gte: start, $lt: end }
    })
      .select({ clienteId: 1 })
      .lean();

    return buildClientMatchSet(records.map((record) => record?.clienteId).filter(Boolean));
  }

  return new Set();
};

const resolveCampaignSelectionPriority = (channel) =>
  CAMPAIGN_SINGLE_CHANNEL_PRIORITY_INDEX[normalizeChannel(channel)] ??
  Number.POSITIVE_INFINITY;

const pickPreferredClientSelection = (currentSelection, nextSelection) => {
  if (!currentSelection) {
    return nextSelection;
  }

  if (!nextSelection) {
    return currentSelection;
  }

  const currentPriority = resolveCampaignSelectionPriority(currentSelection.channel);
  const nextPriority = resolveCampaignSelectionPriority(nextSelection.channel);

  if (nextPriority !== currentPriority) {
    return nextPriority < currentPriority ? nextSelection : currentSelection;
  }

  const currentScore = toFiniteNumber(currentSelection.record?.scoreGeneral) ?? -1;
  const nextScore = toFiniteNumber(nextSelection.record?.scoreGeneral) ?? -1;

  if (nextScore !== currentScore) {
    return nextScore > currentScore ? nextSelection : currentSelection;
  }

  return currentSelection;
};

const resolveCampaignFilters = (filters = {}) => {
  const riesgo = filters.riesgo !== undefined ? normalizeRiskLevel(filters.riesgo) : undefined;
  const scoreMin =
    filters.scoreMin !== undefined || filters.score_min !== undefined
      ? toFiniteNumber(filters.scoreMin ?? filters.score_min)
      : undefined;
  const scoreMax =
    filters.scoreMax !== undefined || filters.score_max !== undefined
      ? toFiniteNumber(filters.scoreMax ?? filters.score_max)
      : undefined;
  const portafolioId =
    filters.portafolioId !== undefined || filters.portafolio_id !== undefined
      ? parseInteger(filters.portafolioId ?? filters.portafolio_id)
      : undefined;
  const debtThreshold =
    filters.debtThreshold !== undefined || filters.debt_threshold !== undefined
      ? toFiniteNumber(filters.debtThreshold ?? filters.debt_threshold)
      : undefined;
  const historyWindowDays =
    filters.historyWindowDays !== undefined || filters.history_window_days !== undefined
      ? parseInteger(filters.historyWindowDays ?? filters.history_window_days)
      : undefined;
  const limit = filters.limit !== undefined ? parseInteger(filters.limit) : undefined;
  const offset = filters.offset !== undefined ? parseInteger(filters.offset) : undefined;

  if (filters.riesgo !== undefined && !riesgo) {
    throw createHttpError(400, 'riesgo es invalido.');
  }

  if (
    (filters.scoreMin !== undefined || filters.score_min !== undefined) &&
    scoreMin === null
  ) {
    throw createHttpError(400, 'scoreMin es invalido.');
  }

  if (
    (filters.scoreMax !== undefined || filters.score_max !== undefined) &&
    scoreMax === null
  ) {
    throw createHttpError(400, 'scoreMax es invalido.');
  }

  if (scoreMin !== undefined && scoreMax !== undefined && scoreMin > scoreMax) {
    throw createHttpError(400, 'scoreMin no puede ser mayor a scoreMax.');
  }

  if (
    (filters.portafolioId !== undefined || filters.portafolio_id !== undefined) &&
    !portafolioId
  ) {
    throw createHttpError(400, 'portafolioId es invalido.');
  }

  return {
    riesgo,
    scoreMin,
    scoreMax,
    portafolioId,
    debtThreshold,
    historyWindowDays,
    limit,
    offset
  };
};

const buildDefaultCampaignName = ({ filters = {}, selectedChannels, now = new Date() }) => {
  const timestamp = formatTimestampSegment(now);
  const channelSegment = Array.from(selectedChannels)
    .map((channel) => CAMPAIGN_CHANNEL_KEYS[channel])
    .filter(Boolean)
    .join('_');
  const portfolioSegment = filters.portafolioId ? `p${filters.portafolioId}` : 'global';

  return `campaign_${portfolioSegment}_${channelSegment || 'all'}_${timestamp}`;
};

const resolveCampaignName = (filters = {}, selectedChannels, now = new Date()) =>
  normalizeText(filters.nombre ?? filters.name) || buildDefaultCampaignName({
    filters,
    selectedChannels,
    now
  });

const resolveCampaignCreatorId = (filters = {}, dependencies = {}) =>
  resolveDecisionUserId(
    dependencies.createdBy ??
      filters.creadoPor ??
      filters.creado_por ??
      CAMPAIGN_SYSTEM_USER
  );

const buildCampaignPersistedFilters = (filters = {}) => {
  const persistedFilters = {};

  if (filters.riesgo) {
    persistedFilters.riesgo = filters.riesgo;
  }

  if (filters.scoreMin !== undefined && filters.scoreMin !== null) {
    persistedFilters.scoreMin = filters.scoreMin;
  }

  if (filters.scoreMax !== undefined && filters.scoreMax !== null) {
    persistedFilters.scoreMax = filters.scoreMax;
  }

  if (filters.portafolioId) {
    persistedFilters.portafolioId = filters.portafolioId;
  }

  return persistedFilters;
};

const buildChannelFileFingerprint = (record = {}) =>
  [
    normalizeText(record?.clienteId),
    normalizeChannel(record?.canalRecomendado),
    normalizeText(Array.isArray(record?.telefonos) ? record.telefonos[0] : record?.telefonos)
  ].join('::');

const buildChannelFilePayload = (records = []) => {
  const seenFingerprints = new Set();

  return records
    .filter((record) => {
      const fingerprint = buildChannelFileFingerprint(record);
      if (seenFingerprints.has(fingerprint)) {
        return false;
      }

      seenFingerprints.add(fingerprint);
      return true;
    })
    .map((record) => ({
      nombre: record?.nombre ?? null,
      clienteId: record?.clienteId ?? null,
      telefonos: resolvePhoneList(record),
      emails: resolveEmailList(record),
      direccion: record?.direccion ?? null,
      scoreGeneral: record?.scoreGeneral ?? null,
      riesgo: normalizeText(record?.riesgo).toUpperCase() || null,
      canalRecomendado: normalizeChannel(record?.canalRecomendado),
      razon: record?.razon ?? null
    }));
};

const buildDateDaysAgo = (value, days) => {
  const baseDate = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  baseDate.setDate(baseDate.getDate() - days);
  return baseDate;
};

const resolveCampaignReferenceDate = (value = new Date()) => {
  const resolvedDate = value instanceof Date ? value : new Date(value || Date.now());

  if (Number.isNaN(resolvedDate.getTime())) {
    throw createHttpError(400, 'fecha de campaña es inválida.');
  }

  return resolvedDate;
};

const resolveCampaignBatchSize = (resolvedFilters = {}, dependencies = {}) => {
  const requestedBatchSize = parseInteger(
    dependencies.batchSize ?? dependencies.batch_size
  );

  if (requestedBatchSize && requestedBatchSize > 0) {
    return Math.min(requestedBatchSize, MAX_CAMPAIGN_BATCH_SIZE);
  }

  if (resolvedFilters.limit && resolvedFilters.limit > 0) {
    return Math.min(resolvedFilters.limit, MAX_CAMPAIGN_BATCH_SIZE);
  }

  return DEFAULT_CAMPAIGN_BATCH_SIZE;
};

const resolveCampaignHistoryWindowDays = (resolvedFilters = {}) =>
  resolvedFilters.historyWindowDays && resolvedFilters.historyWindowDays > 0
    ? resolvedFilters.historyWindowDays
    : DEFAULT_HISTORY_WINDOW_DAYS;

const buildEmptyCampaignCounts = () => ({
  llamada: 0,
  whatsapp: 0,
  sms: 0,
  email: 0,
  visita: 0
});

const buildCampaignFileBaseFolder = (campaignName, now = new Date()) =>
  `${sanitizeFileSegment(campaignName)}_${formatTimestampSegment(now)}`;

const createCampaignWorkbookWriters = ({
  selectedChannels,
  campaignName,
  now = new Date(),
  writerFactory = createCampaignWorkbookWriter
}) => {
  const baseFolder = buildCampaignFileBaseFolder(campaignName, now);
  const writers = {};

  for (const channel of CAMPAIGN_CHANNEL_ORDER) {
    if (!selectedChannels.has(channel)) {
      continue;
    }

    const channelKey = CAMPAIGN_CHANNEL_KEYS[channel];
    writers[channelKey] = writerFactory(path.join(baseFolder, channelKey));
  }

  return writers;
};

const buildBufferedGroupedSelections = (selectedByClient = new Map()) => {
  const grouped = buildEmptyCampaignGroups();

  for (const selection of selectedByClient.values()) {
    if (!selection?.channelKey || !grouped[selection.channelKey]) {
      continue;
    }

    grouped[selection.channelKey].push(selection.record);
  }

  return grouped;
};

const countGroupedCampaigns = (grouped = {}) =>
  Object.values(grouped).reduce(
    (sum, channelRecords) => sum + (Array.isArray(channelRecords) ? channelRecords.length : 0),
    0
  );

const createCampaignAccumulator = ({
  selectedChannels,
  campaignName,
  now = new Date(),
  dependencies = {}
}) => {
  const bufferedMode =
    dependencies.collectGroupedRecords !== false ||
    typeof dependencies.fileGenerator === 'function';

  if (bufferedMode) {
    return {
      mode: 'buffered',
      selectedByClient: new Map(),
      grouped: buildEmptyCampaignGroups(),
      counts: buildEmptyCampaignCounts(),
      totalClientes: 0
    };
  }

  return {
    mode: 'streaming',
    seenClientIds: new Set(),
    grouped: null,
    counts: buildEmptyCampaignCounts(),
    totalClientes: 0,
    writers: createCampaignWorkbookWriters({
      selectedChannels,
      campaignName,
      now,
      writerFactory:
        typeof dependencies.workbookWriterFactory === 'function'
          ? dependencies.workbookWriterFactory
          : createCampaignWorkbookWriter
    })
  };
};

const finalizeBufferedAccumulator = (accumulator) => {
  const grouped = buildBufferedGroupedSelections(accumulator.selectedByClient);
  accumulator.grouped = grouped;
  accumulator.totalClientes = countGroupedCampaigns(grouped);

  for (const channelKey of Object.keys(accumulator.counts || {})) {
    accumulator.counts[channelKey] = Array.isArray(grouped[channelKey])
      ? grouped[channelKey].length
      : 0;
  }

  return grouped;
};

const addSelectionToBufferedAccumulator = (accumulator, selection) => {
  const clientKey = selection.clientKey || selection.record?.clienteId;
  const currentSelection = accumulator.selectedByClient.get(clientKey);
  const preferredSelection = pickPreferredClientSelection(currentSelection, selection);
  accumulator.selectedByClient.set(clientKey, preferredSelection);
};

const addSelectionToStreamingAccumulator = async (accumulator, selection) => {
  const clientKey = String(selection.clientKey || selection.record?.clienteId || '').trim();
  if (!clientKey || accumulator.seenClientIds.has(clientKey)) {
    return false;
  }

  accumulator.seenClientIds.add(clientKey);
  accumulator.totalClientes += 1;
  accumulator.counts[selection.channelKey] += 1;

  const writer = accumulator.writers?.[selection.channelKey];
  if (writer) {
    await writer.appendRows(buildChannelFilePayload([selection.record]));
  }

  return true;
};

const createCampaignFilesFromGrouped = async ({
  grouped,
  selectedChannels,
  campaignName,
  now = new Date(),
  fileGenerator = generarArchivo
}) => {
  const baseFolder = buildCampaignFileBaseFolder(campaignName, now);
  const archivos = {};

  for (const channel of CAMPAIGN_CHANNEL_ORDER) {
    if (!selectedChannels.has(channel)) {
      continue;
    }

    const channelKey = CAMPAIGN_CHANNEL_KEYS[channel];
    if (!Array.isArray(grouped[channelKey]) || grouped[channelKey].length === 0) {
      continue;
    }

    archivos[channelKey] = await fileGenerator(
      path.join(baseFolder, channelKey),
      buildChannelFilePayload(grouped[channelKey] || [])
    );
  }

  return archivos;
};

const finalizeCampaignFiles = async ({
  accumulator,
  selectedChannels,
  campaignName,
  now = new Date(),
  dependencies = {}
}) => {
  if (accumulator.mode === 'buffered') {
    const grouped = finalizeBufferedAccumulator(accumulator);
    const archivos = await createCampaignFilesFromGrouped({
      grouped,
      selectedChannels,
      campaignName,
      now,
      fileGenerator: dependencies.fileGenerator || generarArchivo
    });

    return {
      archivos,
      grouped,
      totalClientes: accumulator.totalClientes
    };
  }

  const archivos = {};

  for (const channel of CAMPAIGN_CHANNEL_ORDER) {
    if (!selectedChannels.has(channel)) {
      continue;
    }

    const channelKey = CAMPAIGN_CHANNEL_KEYS[channel];
    const writer = accumulator.writers?.[channelKey];
    if (!writer || writer.getRowCount() === 0) {
      continue;
    }

    archivos[channelKey] = await writer.finalize();
  }

  return {
    archivos,
    grouped: buildEmptyCampaignGroups(),
    totalClientes: accumulator.totalClientes
  };
};

const saveCampaign = async ({
  totalClientes,
  selectedChannels,
  campaignName,
  resolvedFilters,
  rawFilters = {},
  archivos,
  now = new Date(),
  dependencies = {}
}) => {
  const CampaignModel = dependencies.CampaignModel || Campaign;

  if (CampaignModel === Campaign) {
    await connectMongo();
  }

  const payload = {
    nombre: campaignName,
    fechaCreacion: now instanceof Date ? now : new Date(now || Date.now()),
    creadoPor: resolveCampaignCreatorId(rawFilters, dependencies),
    filtros: buildCampaignPersistedFilters(resolvedFilters),
    canales: Array.from(selectedChannels),
    totalClientes: Number.isFinite(totalClientes) ? totalClientes : 0,
    estado: 'GENERADA',
    archivos
  };

  if (typeof CampaignModel.create === 'function') {
    return CampaignModel.create(payload);
  }

  const campaign = new CampaignModel(payload);
  await campaign.save();
  return campaign;
};

const ensureCampaignsAvailable = async () => {
  if (!isMongoConfigured()) {
    throw createHttpError(503, 'Campaign Engine requiere Mongo configurado.');
  }

  await connectMongo();
};

const buildCampaignQueryArgs = ({
  resolvedFilters,
  limit,
  offset,
  afterClientInternalId
}) => ({
  portafolioId: resolvedFilters.portafolioId,
  riesgo: resolvedFilters.riesgo,
  scoreMin: resolvedFilters.scoreMin,
  scoreMax: resolvedFilters.scoreMax,
  limit,
  offset,
  afterClientInternalId
});

async function* iterateCampaignClientBatches(resolvedFilters = {}, dependencies = {}) {
  const listClients =
    typeof dependencies.listClients === 'function'
      ? dependencies.listClients
      : listEligibleCampaignClients;
  const batchSize = resolveCampaignBatchSize(resolvedFilters, dependencies);
  const usePaginatedCursor =
    typeof dependencies.listClients === 'function'
      ? dependencies.paginateClients === true
      : dependencies.useKeysetPagination !== false;

  if (!usePaginatedCursor) {
    const rows = await listClients(
      buildCampaignQueryArgs({
        resolvedFilters,
        limit: resolvedFilters.limit,
        offset: resolvedFilters.offset
      })
    );
    yield Array.isArray(rows) ? rows : [];
    return;
  }

  const hardLimit =
    Number.isInteger(resolvedFilters.limit) && resolvedFilters.limit > 0
      ? resolvedFilters.limit
      : null;
  let fetchedCount = 0;
  let currentOffset = Math.max(resolvedFilters.offset || 0, 0);
  let lastClientInternalId = null;
  let shouldUseInitialOffset = currentOffset > 0;

  while (true) {
    const currentLimit =
      hardLimit === null ? batchSize : Math.min(batchSize, hardLimit - fetchedCount);

    if (!currentLimit || currentLimit <= 0) {
      break;
    }

    const rows = await listClients(
      buildCampaignQueryArgs({
        resolvedFilters,
        limit: currentLimit,
        offset:
          usePaginatedCursor && !dependencies.paginateClients && !shouldUseInitialOffset
            ? 0
            : currentOffset,
        afterClientInternalId:
          usePaginatedCursor &&
          !dependencies.paginateClients &&
          !shouldUseInitialOffset
            ? lastClientInternalId
            : undefined
      })
    );
    const safeRows = Array.isArray(rows) ? rows : [];

    if (safeRows.length === 0) {
      break;
    }

    yield safeRows;

    fetchedCount += safeRows.length;
    currentOffset += safeRows.length;

    if (hardLimit !== null && fetchedCount >= hardLimit) {
      break;
    }

    if (safeRows.length < currentLimit) {
      break;
    }

    if (usePaginatedCursor && !dependencies.paginateClients) {
      lastClientInternalId =
        parseInteger(safeRows[safeRows.length - 1]?.client_internal_id) || lastClientInternalId;
    }

    shouldUseInitialOffset = false;
  }
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return [];
  }

  const safeConcurrency = Math.max(1, Math.min(concurrency || DEFAULT_CONCURRENCY, safeItems.length));
  const results = new Array(safeItems.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < safeItems.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(safeItems[currentIndex], currentIndex);
    }
  };

  await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
  return results;
};

const buildStrategyBatchRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    decisionClientId: resolveDecisionClientId(row.client_id)
  }));

const loadStrategyBatchData = async (
  rows = [],
  resolvedFilters = {},
  dependencies = {}
) => {
  const ClienteScoreModel = dependencies.ClienteScoreModel || ClienteScore;
  const ContactHistoryModel = dependencies.ContactHistoryModel || ContactHistory;
  const now = resolveCampaignReferenceDate(dependencies.now);
  const rowsWithDecisionIds = buildStrategyBatchRows(rows);
  const decisionIds = rowsWithDecisionIds.map((row) => row.decisionClientId);
  const historySince = buildDateDaysAgo(now, resolveCampaignHistoryWindowDays(resolvedFilters));
  const scoreByDecisionId = new Map();
  const historyByDecisionId = new Map();

  if (decisionIds.length === 0) {
    return {
      rowsWithDecisionIds,
      scoreByDecisionId,
      historyByDecisionId
    };
  }

  if (ClienteScoreModel === ClienteScore || ContactHistoryModel === ContactHistory) {
    await connectMongo();
  }

  const [scores, histories] = await Promise.all([
    typeof ClienteScoreModel.find === 'function'
      ? ClienteScoreModel.find({ clienteId: { $in: decisionIds } })
          .select({
            clienteId: 1,
            scoreGeneral: 1,
            canales: 1,
            riesgo: 1,
            montoDeuda: 1,
            estrategia: 1
          })
          .lean()
      : [],
    typeof ContactHistoryModel.find === 'function'
      ? ContactHistoryModel.find({
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
      : []
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

  return {
    rowsWithDecisionIds,
    scoreByDecisionId,
    historyByDecisionId
  };
};

const evaluateCampaignBatchDecisions = async (
  rows = [],
  resolvedFilters = {},
  dependencies = {}
) => {
  if (typeof dependencies.strategyBatchResolver === 'function') {
    return dependencies.strategyBatchResolver({
      rows,
      resolvedFilters,
      now: resolveCampaignReferenceDate(dependencies.now)
    });
  }

  if (typeof dependencies.strategyResolver === 'function') {
    const strategyResolver = dependencies.strategyResolver;
    return mapWithConcurrency(rows, dependencies.concurrency || DEFAULT_CONCURRENCY, async (row) => ({
      row,
      decision: await strategyResolver(resolveDecisionClientId(row.client_id), {
        debtThreshold: resolvedFilters.debtThreshold,
        historyWindowDays: resolvedFilters.historyWindowDays,
        now: dependencies.now
      })
    }));
  }

  const {
    rowsWithDecisionIds,
    scoreByDecisionId,
    historyByDecisionId
  } = await loadStrategyBatchData(rows, resolvedFilters, dependencies);
  const now = resolveCampaignReferenceDate(dependencies.now);

  return rowsWithDecisionIds.map((row) => {
    const decisionKey = String(row.decisionClientId);
    const clienteScore = buildCampaignDecisionScoreInput(
      row,
      scoreByDecisionId.get(decisionKey) || null
    );
    const contactHistory = historyByDecisionId.get(decisionKey) || [];

    return {
      row,
      decision: resolverSiguienteAccion({
        clienteScore,
        contactHistory,
        debtThreshold: resolvedFilters.debtThreshold,
        now
      })
    };
  });
};

export const generarCampaña = async (filtros = {}, canales = [], dependencies = {}) => {
  const mongoReady =
    typeof dependencies.isMongoConfigured === 'function'
      ? dependencies.isMongoConfigured()
      : isMongoConfigured();

  if (!mongoReady) {
    throw createHttpError(503, 'Campaign Engine requiere Mongo configurado.');
  }

  const resolvedFilters = resolveCampaignFilters(filtros);
  const requestedChannels = resolveRequestedChannels(canales);
  const campaignNow = resolveCampaignReferenceDate(dependencies.now);
  const campaignName = resolveCampaignName(filtros, requestedChannels, campaignNow);
  const accumulator = createCampaignAccumulator({
    selectedChannels: requestedChannels,
    campaignName,
    now: campaignNow,
    dependencies
  });

  for await (const clientBatch of iterateCampaignClientBatches(resolvedFilters, dependencies)) {
    const contactedTodaySet = await loadClientsContactedToday(clientBatch, {
      ...dependencies,
      now: campaignNow
    });
    const eligibleBatch = clientBatch.filter((row) => {
      if (isClientBlocked(row)) {
        return false;
      }

      if (contactedTodaySet.size === 0) {
        return true;
      }

      const rowKeys = resolveRowClientMatchKeys(row);
      return !Array.from(rowKeys).some((key) => contactedTodaySet.has(key));
    });

    if (eligibleBatch.length === 0) {
      continue;
    }

    const evaluatedClients = await evaluateCampaignBatchDecisions(eligibleBatch, resolvedFilters, {
      ...dependencies,
      now: campaignNow
    });

    for (const evaluatedClient of Array.isArray(evaluatedClients) ? evaluatedClients : []) {
      const row = evaluatedClient?.row;
      const decision = evaluatedClient?.decision;

      if (!row || !decision || !['CONTACTAR', 'VISITAR'].includes(decision.accion)) {
        continue;
      }

      const normalizedChannel = normalizeChannel(decision.canal);
      if (!normalizedChannel || !requestedChannels.has(normalizedChannel)) {
        continue;
      }

      const record = mapCampaignRecord(row, decision);
      if (!record) {
        continue;
      }

      const selection = {
        clientKey: resolvePrimaryClientIdentifier(row),
        channel: normalizedChannel,
        channelKey: CAMPAIGN_CHANNEL_KEYS[normalizedChannel],
        record
      };

      if (accumulator.mode === 'buffered') {
        addSelectionToBufferedAccumulator(accumulator, selection);
        continue;
      }

      await addSelectionToStreamingAccumulator(accumulator, selection);
    }
  }

  const {
    archivos,
    grouped,
    totalClientes
  } = await finalizeCampaignFiles({
    accumulator,
    selectedChannels: requestedChannels,
    campaignName,
    now: campaignNow,
    dependencies
  });

  const campaign = await saveCampaign({
    totalClientes,
    selectedChannels: requestedChannels,
    campaignName,
    resolvedFilters,
    rawFilters: filtros,
    archivos,
    now: campaignNow,
    dependencies
  });

  if (dependencies.returnDetails === true) {
    return {
      grouped: cloneGroupedCampaigns(grouped),
      campaign
    };
  }

  return cloneGroupedCampaigns(grouped);
};

export const generarCampañaDetallada = async (filtros = {}, canales = [], dependencies = {}) =>
  generarCampaña(filtros, canales, {
    ...dependencies,
    returnDetails: true
  });

export const listarCampañas = async ({ limit = 20, offset = 0 } = {}, dependencies = {}) => {
  const CampaignModel = dependencies.CampaignModel || Campaign;

  if (CampaignModel === Campaign) {
    await ensureCampaignsAvailable();
  }

  const safeLimit = Math.min(parseInteger(limit) || 20, 100);
  const safeOffset = Math.max(parseInteger(offset) || 0, 0);

  if (typeof CampaignModel.find === 'function') {
    return CampaignModel.find({})
      .sort({ fechaCreacion: -1, createdAt: -1, _id: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();
  }

  return [];
};

export const obtenerCampañaPorId = async (campaignId, dependencies = {}) => {
  const CampaignModel = dependencies.CampaignModel || Campaign;

  if (!campaignId) {
    throw createHttpError(400, 'id de campaña es obligatorio.');
  }

  if (CampaignModel === Campaign) {
    await ensureCampaignsAvailable();
  }

  const campaign =
    typeof CampaignModel.findById === 'function'
      ? await CampaignModel.findById(campaignId).lean()
      : null;

  if (!campaign) {
    throw createHttpError(404, 'Campaña no encontrada.');
  }

  return campaign;
};

export const obtenerArchivoCampaña = async (campaignId, canal, dependencies = {}) => {
  const normalizedChannel = normalizeChannel(canal);
  if (!normalizedChannel) {
    throw createHttpError(400, 'canal es invalido.');
  }

  const campaign = await obtenerCampañaPorId(campaignId, dependencies);
  const channelKey = CAMPAIGN_CHANNEL_KEYS[normalizedChannel];
  const absolutePath = campaign?.archivos?.[channelKey];

  if (!absolutePath) {
    throw createHttpError(404, 'Archivo de campaña no encontrado para el canal solicitado.');
  }

  try {
    await fs.access(absolutePath);
  } catch {
    throw createHttpError(404, 'Archivo de campaña no encontrado para el canal solicitado.');
  }

  return {
    campaign,
    canal: normalizedChannel,
    absolutePath,
    fileName: path.basename(absolutePath)
  };
};

export default {
  generarCampaña,
  generarCampañaDetallada,
  listarCampañas,
  obtenerCampañaPorId,
  obtenerArchivoCampaña
};
