import path from 'node:path';
import { processPortfolioImport } from './portfolio-import.worker.js';
import { processClientImport } from './client-import.worker.js';
import { processCreditImport } from './credit-import.worker.js';
import { getJobById, updateJob } from '../jobs/jobs.repository.js';
import { upsertBulkImportAudit } from '../audit/audit-imports.repository.js';
import { logError, logInfo } from '../../utils/structured-logger.js';
import env from '../../config/env.js';
import { queueConfig } from '../../config/queue.js';
import { acquireSemaphore, refreshSemaphore, releaseSemaphore } from '../../queues/semaphore.js';

const handlers = {
  portfolios: processPortfolioImport,
  portafolios: processPortfolioImport,
  clients: processClientImport,
  clientes: processClientImport,
  credits: processCreditImport,
  creditos: processCreditImport
};

const normalizeTipo = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeUserId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const parsePayloadResumen = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

const resolveArchivo = (data, payloadResumen) => {
  if (data?.file?.originalName) {
    return data.file.originalName;
  }

  if (data?.file?.path) {
    return path.basename(data.file.path);
  }

  if (payloadResumen?.originalName) {
    return payloadResumen.originalName;
  }

  if (payloadResumen?.storedName) {
    return payloadResumen.storedName;
  }

  return null;
};

const resolveAuditContext = async ({ jobId, data, tipo }) => {
  const usuarioId = normalizeUserId(data?.userId ?? data?.usuarioId);
  const tipoCarga = tipo || normalizeTipo(data?.tipo);

  if (usuarioId && tipoCarga && data?.file?.originalName) {
    return { usuarioId, tipoCarga, archivo: data.file.originalName };
  }

  if (!Number.isInteger(jobId)) {
    return {
      usuarioId,
      tipoCarga: tipoCarga || 'desconocido',
      archivo: resolveArchivo(data, null)
    };
  }

  const jobRecord = await getJobById(jobId);
  const payloadResumen = parsePayloadResumen(jobRecord?.payload_resumen);

  return {
    usuarioId: usuarioId ?? normalizeUserId(jobRecord?.usuario_id),
    tipoCarga: tipoCarga || normalizeTipo(jobRecord?.tipo) || 'desconocido',
    archivo: resolveArchivo(data, payloadResumen)
  };
};

const buildResultado = ({ result, status }) => {
  if (status === 'error' || !result) {
    return 'error';
  }

  const errors = normalizeCount(result.errors);
  if (errors > 0) {
    return 'parcial';
  }

  return 'exitoso';
};

const persistBulkImportAudit = async ({ jobId, data, result, status, finishedAt }) => {
  if (!Number.isInteger(jobId)) {
    return;
  }

  const { usuarioId, tipoCarga, archivo } = await resolveAuditContext({
    jobId,
    data,
    tipo: normalizeTipo(data?.tipo)
  });

  const volumenProcesado = normalizeCount(
    result?.processed ?? result?.totalRows ?? 0
  );

  await upsertBulkImportAudit({
    jobId,
    usuarioId,
    tipoCarga,
    archivo,
    resultado: buildResultado({ result, status }),
    volumenProcesado,
    finishedAt
  });
};

const scheduleBulkImportAudit = (payload) => {
  setImmediate(() => {
    persistBulkImportAudit(payload).catch((err) => {
      logError('bulk_import.audit.failed', err, { jobId: payload.jobId });
    });
  });
};

class QueueLockError extends Error {
  constructor(message) {
    super(message);
    this.code = 'QUEUE_LOCKED';
  }
}

const normalizePortafolioId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildLockKey = (suffix) => `queue:${queueConfig.name}:${suffix}`;

const acquireLocks = async ({ portafolioId }) => {
  const locks = [];
  const ttlMs = env.queue.lockTtlMs;

  if (env.queue.maxActive > 0) {
    const globalKey = buildLockKey('active');
    const token = await acquireSemaphore({
      key: globalKey,
      max: env.queue.maxActive,
      ttlMs
    });

    if (!token) {
      throw new QueueLockError('Limite de jobs simultaneos alcanzado');
    }

    locks.push({ key: globalKey, token, ttlMs });
  }

  if (portafolioId) {
    const portfolioKey = buildLockKey(`portfolio:${portafolioId}`);
    const token = await acquireSemaphore({
      key: portfolioKey,
      max: 1,
      ttlMs
    });

    if (!token) {
      await Promise.all(
        locks.map((lock) => releaseSemaphore({ key: lock.key, token: lock.token }))
      );
      throw new QueueLockError('Portafolio bloqueado');
    }

    locks.push({ key: portfolioKey, token, ttlMs });
  }

  return locks;
};

const startLockHeartbeat = (locks) => {
  if (!locks.length) {
    return () => {};
  }

  const intervalMs = Math.max(1000, env.queue.lockRenewIntervalMs);
  const timer = setInterval(() => {
    locks.forEach((lock) => {
      refreshSemaphore({ key: lock.key, token: lock.token, ttlMs: lock.ttlMs });
    });
  }, intervalMs);

  return () => clearInterval(timer);
};

export const processBulkImportJob = async (job) => {
  const jobId = Number(job.id);
  const data = job.data || {};
  const tipo = normalizeTipo(data.tipo);
  const handler = handlers[tipo];
  const portafolioId = normalizePortafolioId(data.portafolioId || data.portafolio_id);

  if (!handler) {
    const message = 'Tipo de importacion no soportado';
    if (Number.isInteger(jobId)) {
      await updateJob(jobId, {
        estado: 'error',
        error: message,
        finishedAt: new Date()
      });
    }
    throw new Error(message);
  }

  let locks = [];
  let stopHeartbeat = () => {};

  try {
    locks = await acquireLocks({ portafolioId });
    stopHeartbeat = startLockHeartbeat(locks);

    if (Number.isInteger(jobId)) {
      await updateJob(jobId, { estado: 'procesando', progreso: 0 });
    }

    logInfo('bulk_import.started', { jobId, tipo, portafolioId });

    const result = await handler({ jobId, data });

    const finishedAt = new Date();
    if (Number.isInteger(jobId)) {
      await updateJob(jobId, {
        estado: 'terminado',
        progreso: 100,
        finishedAt
      });
    }

    scheduleBulkImportAudit({
      jobId,
      data,
      result,
      status: 'success',
      finishedAt
    });

    logInfo('bulk_import.completed', { jobId, tipo, portafolioId });
    return result;
  } catch (err) {
    if (err?.code === 'QUEUE_LOCKED') {
      logInfo('bulk_import.locked', {
        jobId,
        tipo,
        portafolioId,
        retryDelayMs: env.queue.lockRetryDelayMs
      });
      if (Number.isInteger(jobId)) {
        await updateJob(jobId, { estado: 'pendiente', progreso: 0, error: null });
      }

      err.retryDelayMs = env.queue.lockRetryDelayMs;
      throw err;
    }

    logError('bulk_import.failed', err, { jobId, tipo, portafolioId });

    const finishedAt = new Date();
    if (Number.isInteger(jobId)) {
      await updateJob(jobId, {
        estado: 'error',
        error: err?.message || 'Error en importacion',
        finishedAt
      });
    }

    scheduleBulkImportAudit({
      jobId,
      data,
      result: null,
      status: 'error',
      finishedAt
    });

    throw err;
  } finally {
    stopHeartbeat();
    if (locks.length) {
      await Promise.all(
        locks.map((lock) => releaseSemaphore({ key: lock.key, token: lock.token }))
      );
    }
  }
};
