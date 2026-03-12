import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../../config/env.js';
import { createHttpError } from '../../utils/http-error.js';
import { logInfo, logWarn } from '../../utils/structured-logger.js';
import {
  createImportSession,
  findImportSessionByHash,
  getImportSessionById,
  updateImportSession
} from './import-sessions.repository.js';
import { getPortfolioById } from '../portfolios/portfolios.repository.js';
import { listSaldoFieldsByPortfolio } from '../saldo-fields/saldo-fields.repository.js';
import { getBalanceFieldById } from '../balance-fields/balance-fields.repository.js';
import { enqueueJob } from '../../queues/main.queue.js';
import { createJob, updateJob } from '../jobs/jobs.repository.js';
import { createAuditLog } from '../audit/audit.repository.js';
import {
  computeFileHash,
  detectFileType,
  parseHeaders,
  getSampleRows
} from './utils/file-parser.js';
import { validateImportSession } from './validator.service.js';

const sessionEditableStatuses = new Set([
  'PENDING',
  'MAPPING',
  'VALIDATING',
  'FAILED',
  'VALIDATED'
]);

const normalizeUserId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePositiveInteger = (value, label) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${label} invalido`);
  }
  return parsed;
};

const safeRemoveFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    logWarn('import_session.cleanup_failed', { filePath, error: err?.message });
  }
};

const ensurePortfolioExists = async (portfolioId) => {
  const portfolio = await getPortfolioById(portfolioId);
  if (!portfolio) {
    throw createHttpError(404, 'Portafolio no encontrado');
  }
  return portfolio;
};

const ensureSessionEditable = (session) => {
  if (!sessionEditableStatuses.has(session.status)) {
    throw createHttpError(400, `La sesion no admite cambios en estado ${session.status}`);
  }
};

const buildSaldoFieldsSnapshot = async (portfolioId) => {
  try {
    const fields = await listSaldoFieldsByPortfolio({ portfolioId });
    const dynamicFields = (fields || []).filter((field) => field.value_type === 'dynamic');

    return {
      capturedAt: new Date().toISOString(),
      fields: dynamicFields.map((field) => ({
        id: field.id,
        portfolioId: field.portfolio_id,
        key: field.key,
        label: field.label,
        fieldType: field.field_type,
        valueType: field.value_type,
        required: field.required,
        visible: field.visible,
        orderIndex: field.order_index
      }))
    };
  } catch (err) {
    // Si la tabla no existe (o hay otro error no crítico), degradamos a snapshot vacío para no romper el flujo.
    logWarn('import_session.saldo_snapshot_failed', {
      portfolioId,
      error: err?.message,
      code: err?.code
    });
    return { capturedAt: new Date().toISOString(), fields: [] };
  }
};

const ensureSaldoFieldsInMapping = ({ mapping, snapshot }) => {
  const fields = snapshot?.fields || [];
  const allowedIds = new Set(fields.map((field) => Number(field.id)));

  mapping
    .filter((item) => item.targetType === 'saldo_field')
    .forEach((item) => {
      if (!allowedIds.has(Number(item.saldoFieldId))) {
        throw createHttpError(
          400,
          `saldoFieldId ${item.saldoFieldId} no pertenece al portafolio`
        );
      }
    });
};

const ensureBalanceFieldsInMapping = async ({ mapping, portfolioId }) => {
  const balanceItems = mapping.filter((item) => item.targetType === 'balance_field');
  if (!balanceItems.length) {
    return;
  }

  const uniqueIds = [
    ...new Set(
      balanceItems.map((item) => {
        const parsed = Number.parseInt(item.saldoFieldId, 10);
        return Number.isInteger(parsed) ? parsed : null;
      })
    )
  ].filter((id) => Number.isInteger(id) && id > 0);

  try {
    for (const fieldId of uniqueIds) {
      const field = await getBalanceFieldById({ portafolioId: portfolioId, fieldId });
      if (!field) {
        throw createHttpError(
          400,
          `balanceFieldId ${fieldId} no pertenece al portafolio`
        );
      }
    }
  } catch (err) {
    // Si la tabla de balances no está disponible, registramos y permitimos continuar sin validar balance fields.
    if (err?.code === '42P01') {
      logWarn('import_session.balance_fields_unavailable', {
        portfolioId,
        error: err?.message
      });
      return;
    }
    throw err;
  }
};

const normalizeTargetType = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (['saldo_field', 'saldo', 'saldo_field_id'].includes(normalized)) {
    return 'saldo_field';
  }
  if (['balance_field', 'balance', 'campo_saldo'].includes(normalized)) {
    return 'balance_field';
  }
  if (['ignore', 'ignorar'].includes(normalized)) {
    return 'ignore';
  }
  return 'core';
};

const normalizeStrategy = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!normalized) {
    return 'UPSERT';
  }
  const allowedStrategies = new Set(['ONLY_NEW', 'ONLY_UPDATE', 'UPSERT']);
  if (!allowedStrategies.has(normalized)) {
    throw createHttpError(400, 'strategy invalida');
  }
  return normalized;
};

const disallowedCoreTargetFields = new Map([
  ['credit.cliente_id', 'es un id interno del sistema'],
  ['client.public_id', 'se genera automáticamente por el sistema'],
  ['credit.numero_credito_externo', 'se genera automáticamente por el sistema'],
  ['client.nombre', 'debe cargarse como client.nombre_completo'],
  ['client.apellido_paterno', 'debe cargarse como client.nombre_completo'],
  ['client.apellido_materno', 'debe cargarse como client.nombre_completo']
]);

const normalizeMapping = (raw) => {
  const mapping = (() => {
    if (raw === undefined || raw === null) return null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch (err) {
        return null;
      }
    }
    return null;
  })();

  if (!mapping || !Array.isArray(mapping) || mapping.length === 0) {
    throw createHttpError(400, 'mapping requerido');
  }

  const normalized = mapping
    .map((entry) => {
      if (!entry) return null;

      const column = String(entry.column ?? entry.header ?? '').trim();
      if (!column) return null;

      const actionRaw = entry.action ?? entry.accion;
      const action =
        typeof actionRaw === 'string' && actionRaw.toLowerCase() === 'ignore'
          ? 'ignore'
          : 'map';

      const targetType = normalizeTargetType(
        entry.targetType ?? entry.target_type ?? entry.type
      );
      const saldoFieldId = Number.parseInt(
        entry.saldoFieldId ?? entry.saldo_field_id ?? entry.balanceFieldId,
        10
      );
      const targetField = String(
        entry.targetField ?? entry.field ?? entry.fieldKey ?? entry.key ?? ''
      ).trim();

      if (action === 'ignore' || targetType === 'ignore') {
        return { column, action: 'ignore' };
      }

      if (targetType === 'saldo_field' || targetType === 'balance_field') {
        if (!Number.isInteger(saldoFieldId) || saldoFieldId <= 0) {
          throw createHttpError(400, `saldoFieldId requerido para la columna ${column}`);
        }
        return {
          column,
          action: 'map',
          targetType,
          saldoFieldId,
          fieldKey: entry.fieldKey ?? entry.key ?? null
        };
      }

      if (!targetField) {
        throw createHttpError(400, `targetField requerido para la columna ${column}`);
      }

      return { column, action: 'map', targetType: 'core', targetField };
    })
    .filter(Boolean);

  if (!normalized.length) {
    throw createHttpError(400, 'mapping no puede estar vacio');
  }

  const mappedCount = normalized.filter((item) => item.action !== 'ignore').length;
  if (mappedCount === 0) {
    throw createHttpError(400, 'Debe mapear al menos una columna');
  }

  normalized.forEach((item) => {
    if (item.action === 'ignore' || item.targetType !== 'core') return;
    if (disallowedCoreTargetFields.has(item.targetField)) {
      throw createHttpError(
        400,
        `${item.targetField} no se puede mapear porque ${disallowedCoreTargetFields.get(item.targetField)}`
      );
    }
  });

  return normalized;
};

const scheduleAudit = ({ userId, action, sessionId, ip, usuarioGrupos, permisos }) => {
  setImmediate(() => {
    createAuditLog({
      usuarioId: userId ? String(userId) : null,
      accion: action,
      entidad: 'import_sessions',
      entidadId: sessionId,
      fecha: new Date(),
      ip,
      usuarioGrupos: usuarioGrupos || null,
      permisos: permisos || null
    }).catch((err) => {
      logWarn('import_session.audit_failed', { sessionId, action, error: err?.message });
    });
  });
};

const resolveStableUploadPath = (sessionId, extension) =>
  path.resolve(
    process.cwd(),
    env.uploads.dir,
    'import-sessions',
    `session-${sessionId}${extension || ''}`
  );

const moveFileToStablePath = async ({ sessionId, tempPath, extension }) => {
  const targetPath = resolveStableUploadPath(sessionId, extension);
  const targetDir = path.dirname(targetPath);
  await fs.mkdir(targetDir, { recursive: true });

  try {
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    await fs.copyFile(tempPath, targetPath);
    await fs.unlink(tempPath).catch(() => {});
  }

  return targetPath;
};

export const createImportSessionService = async ({ portfolioId, userId, audit }) => {
  const resolvedPortfolioId = parsePositiveInteger(portfolioId, 'portfolioId');
  await ensurePortfolioExists(resolvedPortfolioId);

  const session = await createImportSession({
    portfolioId: resolvedPortfolioId,
    createdBy: normalizeUserId(userId)
  });

  scheduleAudit({
    userId,
    action: 'import_sessions.create',
    sessionId: session.id,
    ip: audit?.ip,
    usuarioGrupos: audit?.groups,
    permisos: audit?.permissions
  });

  return session;
};

export const uploadSessionFileService = async ({ sessionId, file, userId, audit }) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }

  ensureSessionEditable(session);

  if (!file) {
    throw createHttpError(400, 'Archivo requerido');
  }

  const previousPath = session.file_path;
  const { type: fileType, extension } = detectFileType({
    filePath: file.path,
    originalName: file.originalname,
    mimeType: file.mimetype
  });

  let currentPath = file.path;
  try {
    const fileHash = await computeFileHash(file.path);
    const duplicate = await findImportSessionByHash({
      portfolioId: session.portfolio_id,
      fileHash
    });

    // Permit reusar el mismo archivo en otras sesiones; si choca con el constraint, guardamos file_hash como null.
    const storeHash = !(duplicate && duplicate.id !== session.id);
    if (!storeHash) {
      logWarn('import_session.duplicate_file_reused', {
        currentSessionId: session.id,
        duplicateSessionId: duplicate.id,
        portfolioId: session.portfolio_id
      });
    }

    const stablePath = await moveFileToStablePath({
      sessionId: session.id,
      tempPath: file.path,
      extension
    });
    currentPath = stablePath;

    const headerResult = await parseHeaders({
      filePath: stablePath,
      fileType
    });

    const updated = await updateImportSession(session.id, {
      filename: file.originalname || file.filename || null,
      fileHash: storeHash ? fileHash : null,
      filePath: stablePath,
      fileMeta: {
        originalName: file.originalname,
        storedName: path.basename(stablePath),
        size: file.size,
        mimeType: file.mimetype,
        fileType,
        encoding: headerResult.encoding,
        separator: headerResult.separator
      },
      detectedHeaders: headerResult.headers,
      status: 'MAPPING',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errorReport: null,
      errorReportPath: null
    });

    if (previousPath && previousPath !== stablePath) {
      await safeRemoveFile(previousPath);
    }

    logInfo('import_session.file_uploaded', {
      sessionId: session.id,
      portfolioId: session.portfolio_id,
      size: file.size
    });

    scheduleAudit({
      userId,
      action: 'import_sessions.upload',
      sessionId: session.id,
      ip: audit?.ip,
      usuarioGrupos: audit?.groups,
      permisos: audit?.permissions
    });

    return updated;
  } catch (err) {
    await safeRemoveFile(currentPath);
    throw err;
  }
};

export const getImportSessionPreviewService = async ({ sessionId, limit }) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }

  if (!session.file_path) {
    throw createHttpError(400, 'La sesion no tiene archivo adjunto');
  }

  const resolvedLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 50;

  const { type: fileType } = detectFileType({
    filePath: session.file_path,
    originalName: session.filename,
    mimeType: session.file_meta?.mimeType
  });

  const sample = await getSampleRows({
    filePath: session.file_path,
    fileType,
    limit: resolvedLimit,
    separator: session.file_meta?.separator
  });

  return {
    headers: session.detected_headers?.length ? session.detected_headers : sample.headers,
    rows: sample.rows,
    sampleCount: sample.rows.length
  };
};

export const saveImportSessionMappingService = async ({
  sessionId,
  mapping: mappingRaw,
  strategy,
  userId,
  audit
}) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }
  ensureSessionEditable(session);

  if (!session.file_path || !session.detected_headers?.length) {
    throw createHttpError(400, 'Debe subir un archivo antes de mapear');
  }

  const normalizedMapping = normalizeMapping(mappingRaw);
  const headersSet = new Set(session.detected_headers.map((h) => h.toLowerCase()));
  const missing = normalizedMapping
    .filter((item) => item.action !== 'ignore')
    .filter((item) => !headersSet.has(item.column.toLowerCase()))
    .map((item) => item.column);

  if (missing.length) {
    throw createHttpError(
      400,
      `Columnas del mapping no existen en el archivo: ${missing.join(', ')}`
    );
  }

  const strategyValue = normalizeStrategy(strategy);
  const saldoSnapshot = await buildSaldoFieldsSnapshot(session.portfolio_id);
  ensureSaldoFieldsInMapping({ mapping: normalizedMapping, snapshot: saldoSnapshot });
  await ensureBalanceFieldsInMapping({
    mapping: normalizedMapping,
    portfolioId: session.portfolio_id
  });

  const updated = await updateImportSession(session.id, {
    mapping: normalizedMapping,
    strategy: strategyValue,
    saldoFieldsSnapshot: saldoSnapshot,
    status: 'MAPPING'
  });

  scheduleAudit({
    userId,
    action: 'import_sessions.mapping_saved',
    sessionId: session.id,
    ip: audit?.ip,
    usuarioGrupos: audit?.groups,
    permisos: audit?.permissions
  });

  return updated;
};

export const validateImportSessionService = async ({ sessionId, userId, audit }) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }
  ensureSessionEditable(session);

  let validatedSession;
  try {
    validatedSession = await validateImportSession({ sessionId: session.id });
  } catch (err) {
    await updateImportSession(session.id, { status: 'FAILED' });
    throw err;
  }

  scheduleAudit({
    userId,
    action: 'import_sessions.validated',
    sessionId: session.id,
    ip: audit?.ip,
    usuarioGrupos: audit?.groups,
    permisos: audit?.permissions
  });

  return {
    session: validatedSession,
    summary: {
      totalRows: validatedSession.total_rows ?? validatedSession.totalRows ?? 0,
      validRows: validatedSession.valid_rows ?? validatedSession.validRows ?? 0,
      invalidRows: validatedSession.invalid_rows ?? validatedSession.invalidRows ?? 0,
      errors: validatedSession.error_report?.count || 0
    }
  };
};

export const runImportSessionService = async ({ sessionId, userId, audit }) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }

  if (session.status === 'RUNNING') {
    throw createHttpError(400, 'La sesion ya se esta ejecutando');
  }

  if (!session.mapping?.length || !session.file_path) {
    throw createHttpError(400, 'Sesion incompleta para ejecutar');
  }

  if (session.status !== 'VALIDATED') {
    await validateImportSession({ sessionId: session.id });
  }

  const job = await createJob({
    tipo: 'import_session',
    usuarioId: normalizeUserId(userId),
    portafolioId: session.portfolio_id,
    payloadResumen: JSON.stringify({
      sessionId: session.id,
      portfolioId: session.portfolio_id,
      filename: session.filename,
      strategy: session.strategy
    })
  });

  try {
    await enqueueJob(
      'import_session',
      {
        sessionId: session.id,
        userId: normalizeUserId(userId),
        jobId: job.id
      },
      {
        jobId: String(job.id),
        removeOnComplete: {
          count: env.queue.removeOnCompleteCount,
          age: env.queue.removeOnCompleteAgeSeconds
        },
        removeOnFail: {
          count: env.queue.removeOnFailCount,
          age: env.queue.removeOnFailAgeSeconds
        }
      }
    );
  } catch (err) {
    await updateJob(job.id, {
      estado: 'error',
      error: err?.message || 'No se pudo encolar el job',
      finishedAt: new Date()
    });
    await updateImportSession(session.id, {
      status: 'FAILED',
      errorReport: { message: err?.message || 'No se pudo encolar el job' }
    });
    throw err;
  }

  const updated = await updateImportSession(session.id, {
    status: 'RUNNING',
    jobId: job.id
  });

  scheduleAudit({
    userId,
    action: 'import_sessions.run',
    sessionId: session.id,
    ip: audit?.ip,
    usuarioGrupos: audit?.groups,
    permisos: audit?.permissions
  });

  logInfo('import_session.enqueued', {
    sessionId: session.id,
    jobId: job.id,
    portfolioId: session.portfolio_id
  });

  return { session: updated, job };
};

export const getImportSessionService = async ({ sessionId }) => {
  const resolvedSessionId = parsePositiveInteger(sessionId, 'sessionId');
  const session = await getImportSessionById(resolvedSessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }
  return session;
};
