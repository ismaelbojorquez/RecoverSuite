import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import env from '../../config/env.js';
import { enqueueJob } from '../../queues/main.queue.js';
import { createHttpError } from '../../utils/http-error.js';
import { logInfo } from '../../utils/structured-logger.js';
import { createJob, updateJob } from '../jobs/jobs.repository.js';

const allowedExtensions = new Set(['.csv', '.xlsx']);
const allowedMimeTypes = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const maxHeaderBytes = 256 * 1024;

const parseUserId = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
};

const parseOptionalInteger = (value, label) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${label} invalido`);
  }

  return parsed;
};

const parsePriority = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw createHttpError(400, 'prioridad invalida');
  }

  return Math.max(1, Math.min(parsed, 10));
};

const parseExpectedHeaders = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    // ignore JSON parse errors
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
};

const parseSaldoMapping = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  let mapping = value;
  if (typeof value === 'string') {
    try {
      mapping = JSON.parse(value);
    } catch (err) {
      return null;
    }
  }

  if (!Array.isArray(mapping)) {
    return null;
  }

  const entries = mapping
    .map((item) => {
      if (!item) return null;
      const fieldId = Number.parseInt(item.fieldId ?? item.field_id, 10);
      const column = (item.column ?? item.columna ?? item.header)?.trim();
      if (!Number.isInteger(fieldId) || fieldId <= 0 || !column) {
        return null;
      }
      return { fieldId, column };
    })
    .filter(Boolean);

  return entries.length ? entries : null;
};

const parseCsvLine = (line) => {
  const headers = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      headers.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  headers.push(current);
  return headers;
};

const readFirstLine = async (filePath) => {
  const file = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxHeaderBytes);
    const { bytesRead } = await file.read(buffer, 0, maxHeaderBytes, 0);
    if (bytesRead === 0) {
      return '';
    }

    const chunk = buffer.slice(0, bytesRead).toString('utf8');
    const newlineIndex = chunk.indexOf('\n');
    const line = newlineIndex >= 0 ? chunk.slice(0, newlineIndex) : chunk;
    return line.replace(/\r$/, '').trim();
  } finally {
    await file.close();
  }
};

const normalizeHeaders = (headers) =>
  headers
    .map((header) => String(header ?? '').replace(/^\uFEFF/, '').trim())
    .filter((header) => header.length > 0);

const validateHeaders = (headers, expectedHeaders) => {
  if (!headers.length) {
    throw createHttpError(400, 'El archivo no contiene encabezados validos');
  }

  const normalizedLower = headers.map((header) => header.toLowerCase());
  const duplicates = normalizedLower.filter(
    (header, index) => normalizedLower.indexOf(header) !== index
  );

  if (duplicates.length) {
    const unique = [...new Set(duplicates)];
    throw createHttpError(
      400,
      `Encabezados duplicados: ${unique.join(', ')}`
    );
  }

  if (!expectedHeaders || expectedHeaders.length === 0) {
    return;
  }

  const expectedNormalized = normalizeHeaders(expectedHeaders).map((header) =>
    header.toLowerCase()
  );

  if (!expectedNormalized.length) {
    return;
  }

  const headerSet = new Set(normalizedLower);
  const missing = expectedNormalized.filter((header) => !headerSet.has(header));

  if (missing.length) {
    throw createHttpError(400, `Faltan columnas: ${missing.join(', ')}`);
  }
};

const readHeadersFromCsv = async (filePath) => {
  const headerLine = await readFirstLine(filePath);
  if (!headerLine) {
    throw createHttpError(400, 'El archivo CSV esta vacio');
  }

  return parseCsvLine(headerLine);
};

const readHeadersFromXlsx = (filePath) => {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    sheetRows: 1
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw createHttpError(400, 'El archivo XLSX no contiene hojas');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    blankrows: false
  });

  return rows[0] || [];
};

const removeFileSafe = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (err) {
    // ignore cleanup errors
  }
};

export const createBulkImportService = async ({
  file,
  tipo,
  expectedHeaders,
  userId,
  portafolioId,
  priority,
  saldoMapping
}) => {
  if (!file) {
    throw createHttpError(400, 'Archivo requerido');
  }

  const normalizedTipo = typeof tipo === 'string' ? tipo.trim() : '';
  if (!normalizedTipo) {
    await removeFileSafe(file.path);
    throw createHttpError(400, 'tipo es requerido');
  }

  const resolvedPortafolioId = parseOptionalInteger(portafolioId, 'portafolio_id');
  const resolvedPriority = parsePriority(priority);
  const tipoLower = normalizedTipo.toLowerCase();
  const defaultPriority =
    tipoLower === 'creditos' || tipoLower === 'credits'
      ? 1
      : tipoLower === 'clientes' || tipoLower === 'clients'
        ? 2
        : tipoLower === 'portafolios' || tipoLower === 'portfolios'
          ? 3
          : null;
  const finalPriority = resolvedPriority ?? defaultPriority;

  const extension = path.extname(file.originalname || file.filename || '').toLowerCase();
  if (!allowedExtensions.has(extension)) {
    await removeFileSafe(file.path);
    throw createHttpError(400, 'Formato de archivo no soportado');
  }

  if (file.mimetype && !allowedMimeTypes.has(file.mimetype)) {
    await removeFileSafe(file.path);
    throw createHttpError(400, 'Tipo de archivo no soportado');
  }

  try {
    const headers =
      extension === '.xlsx'
        ? readHeadersFromXlsx(file.path)
        : await readHeadersFromCsv(file.path);

    const normalizedHeaders = normalizeHeaders(headers);
    const expected = parseExpectedHeaders(expectedHeaders);
    const parsedSaldoMapping = parseSaldoMapping(saldoMapping);

    validateHeaders(normalizedHeaders, expected);

    const payloadSummary = JSON.stringify({
      tipo: normalizedTipo,
      portafolio_id: resolvedPortafolioId,
      priority: finalPriority,
      originalName: file.originalname,
      storedName: path.basename(file.path),
      size: file.size,
      mimeType: file.mimetype,
      headers: normalizedHeaders,
      saldoMapping: parsedSaldoMapping || null
    });

    const jobRecord = await createJob({
      tipo: normalizedTipo,
      usuarioId: parseUserId(userId),
      portafolioId: resolvedPortafolioId,
      payloadResumen: payloadSummary
    });

    try {
      await enqueueJob(
        'bulk_import',
        {
          jobId: jobRecord.id,
          tipo: normalizedTipo,
          userId: parseUserId(userId),
          portafolioId: resolvedPortafolioId,
          file: {
            path: file.path,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          },
          headers: normalizedHeaders,
          saldoMapping: parsedSaldoMapping
        },
        {
          jobId: String(jobRecord.id),
          ...(finalPriority ? { priority: finalPriority } : {})
        }
      );
    } catch (err) {
      await updateJob(jobRecord.id, {
        estado: 'error',
        error: 'No se pudo encolar el job',
        finishedAt: new Date()
      });
      await removeFileSafe(file.path);
      throw err;
    }

    logInfo('bulk_import.enqueued', {
      jobId: jobRecord.id,
      tipo: normalizedTipo,
      file: file.originalname
    });

    return jobRecord;
  } catch (err) {
    await removeFileSafe(file.path);
    throw err;
  }
};
