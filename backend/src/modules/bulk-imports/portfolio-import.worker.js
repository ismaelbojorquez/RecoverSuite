import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import XLSX from 'xlsx';
import env from '../../config/env.js';
import pool from '../../config/db.js';
import { createJobErrors } from '../jobs/job-errors.repository.js';
import { updateJob } from '../jobs/jobs.repository.js';
import { logInfo } from '../../utils/structured-logger.js';

const batchSize = Math.max(1, env.bulkImport?.batchSize || 200);

const headerAliases = {
  client_id: ['client_id', 'cliente_id'],
  name: ['name', 'nombre'],
  description: ['description', 'descripcion'],
  is_active: ['is_active', 'estado', 'activo']
};

const normalizeHeader = (value) =>
  String(value ?? '').replace(/^\uFEFF/, '').trim().toLowerCase();

const pushError = (rowErrors, jobId, fila, campo, mensaje) => {
  rowErrors.push({ jobId, fila, campo, mensaje });
};

const parseBoolean = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['true', '1', 'si', 'yes', 'activo', 'activa', 'active'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'inactivo', 'inactiva', 'inactive'].includes(normalized)) {
    return false;
  }

  return undefined;
};

const buildHeaderIndex = (headers) => {
  const normalized = headers.map(normalizeHeader);
  const index = {};

  Object.entries(headerAliases).forEach(([key, aliases]) => {
    const matchIndex = normalized.findIndex((header) => aliases.includes(header));
    if (matchIndex >= 0) {
      index[key] = matchIndex;
    }
  });

  if (index.client_id === undefined || index.name === undefined) {
    throw new Error('Columnas requeridas: client_id y name/nombre');
  }

  return index;
};

const parseCsvLine = (line) => {
  const values = [];
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
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const normalizeRowData = (values, headerIndex) => {
  const rawClientId = values[headerIndex.client_id];
  const rawName = values[headerIndex.name];
  const rawDescription =
    headerIndex.description !== undefined ? values[headerIndex.description] : '';
  const rawStatus =
    headerIndex.is_active !== undefined ? values[headerIndex.is_active] : '';

  return {
    raw: {
      client_id: rawClientId ?? '',
      name: rawName ?? '',
      description: rawDescription ?? '',
      is_active: rawStatus ?? ''
    },
    clientId: rawClientId,
    name: rawName,
    description: rawDescription,
    status: rawStatus
  };
};

const buildRowKey = (clientId, name) => `${clientId}|${name.toLowerCase()}`;

const fetchExistingKeys = async (client, pairs) => {
  if (pairs.length === 0) {
    return new Set();
  }

  const values = [];
  const placeholders = pairs.map((pair, index) => {
    const base = index * 2;
    values.push(pair.clientId, pair.nameLower);
    return `($${base + 1}, $${base + 2})`;
  });

  const result = await client.query(
    `SELECT client_id, lower(name) AS name
     FROM portfolios
     WHERE (client_id, lower(name)) IN (${placeholders.join(', ')})`,
    values
  );

  return new Set(result.rows.map((row) => `${row.client_id}|${row.name}`));
};

const insertPortfolios = async ({ client, rows, jobId }) => {
  let inserted = 0;
  const rowErrors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const savepoint = `sp_${index + 1}`;
    await client.query(`SAVEPOINT ${savepoint}`);

    try {
      await client.query(
        `INSERT INTO portfolios (client_id, name, description, is_active)
         VALUES ($1, $2, $3, $4)`,
        [
          row.clientId,
          row.name,
          row.description || null,
          row.isActive ?? true
        ]
      );
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      inserted += 1;
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      pushError(
        rowErrors,
        jobId,
        row.rowNumber,
        'general',
        err?.code ? `Error al insertar (code ${err.code})` : 'Error al insertar'
      );
    }
  }

  return { inserted, rowErrors };
};

const processBatch = async ({ batch, headerIndex, fileKeys, jobId }) => {
  const candidates = [];
  const rowErrors = [];
  const seenKeys = new Set();

  batch.forEach(({ rowNumber, values }) => {
    const normalized = normalizeRowData(values, headerIndex);

    const clientId = Number.parseInt(normalized.clientId, 10);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      pushError(rowErrors, jobId, rowNumber, 'client_id', 'client_id invalido');
      return;
    }

    const name = String(normalized.name ?? '').trim();
    if (!name) {
      pushError(rowErrors, jobId, rowNumber, 'name', 'nombre requerido');
      return;
    }

    const parsedStatus = parseBoolean(normalized.status);
    if (parsedStatus === undefined) {
      pushError(rowErrors, jobId, rowNumber, 'is_active', 'estado invalido');
      return;
    }

    const key = buildRowKey(clientId, name);
    if (fileKeys.has(key)) {
      pushError(
        rowErrors,
        jobId,
        rowNumber,
        'general',
        'registro duplicado en archivo'
      );
      return;
    }

    if (seenKeys.has(key)) {
      pushError(
        rowErrors,
        jobId,
        rowNumber,
        'general',
        'registro duplicado en bloque'
      );
      return;
    }

    seenKeys.add(key);
    fileKeys.add(key);

    candidates.push({
      rowNumber,
      clientId,
      name,
      description: String(normalized.description ?? '').trim() || null,
      isActive: parsedStatus ?? true
    });
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const uniquePairs = [];
    const pairKeys = new Set();
    candidates.forEach((row) => {
      const key = buildRowKey(row.clientId, row.name);
      if (!pairKeys.has(key)) {
        pairKeys.add(key);
        uniquePairs.push({ clientId: row.clientId, nameLower: row.name.toLowerCase() });
      }
    });

    const existingKeys = await fetchExistingKeys(client, uniquePairs);

    const insertRows = candidates.filter((row) => {
      const key = buildRowKey(row.clientId, row.name);
      if (existingKeys.has(key)) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'general',
          'registro duplicado en base'
        );
        return false;
      }
      return true;
    });

    const { inserted, rowErrors: insertErrors } = await insertPortfolios({
      client,
      rows: insertRows,
      jobId
    });

    rowErrors.push(...insertErrors);

    await client.query('COMMIT');

    if (rowErrors.length) {
      await createJobErrors(rowErrors);
    }

    return { processed: batch.length, inserted, errors: rowErrors.length };
  } catch (err) {
    await client.query('ROLLBACK');

    const fallbackRowNumber = batch[0]?.rowNumber || 0;
    pushError(
      rowErrors,
      jobId,
      fallbackRowNumber,
      'general',
      err?.message || 'Error en bloque'
    );

    await createJobErrors(rowErrors);
    return { processed: batch.length, inserted: 0, errors: rowErrors.length };
  } finally {
    client.release();
  }
};

const countCsvRows = async (filePath) => {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lines = 0;

  for await (const line of rl) {
    if (line !== undefined) {
      lines += 1;
    }
  }

  return Math.max(0, lines - 1);
};

const processCsvFile = async ({ filePath, jobId }) => {
  const totalRows = await countCsvRows(filePath);
  if (totalRows === 0) {
    throw new Error('Archivo CSV sin datos');
  }

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers;
  let headerIndex;
  let lineNumber = 0;
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  let lastProgress = -1;
  let batch = [];
  const fileKeys = new Set();

  for await (const line of rl) {
    lineNumber += 1;
    if (lineNumber === 1) {
      headers = parseCsvLine(line);
      headerIndex = buildHeaderIndex(headers);
      continue;
    }

    if (!line.trim()) {
      processed += 1;
      continue;
    }

    batch.push({ rowNumber: lineNumber, values: parseCsvLine(line) });

    if (batch.length >= batchSize) {
      const result = await processBatch({
        batch,
        headerIndex,
        fileKeys,
        jobId
      });

      processed += result.processed;
      inserted += result.inserted;
      errors += result.errors;
      batch = [];

      const progress = Math.min(
        99,
        Math.round((processed / totalRows) * 100)
      );
      if (progress !== lastProgress) {
        await updateJob(jobId, { progreso: progress });
        lastProgress = progress;
      }
    }
  }

  if (batch.length) {
    const result = await processBatch({
      batch,
      headerIndex,
      fileKeys,
      jobId
    });

    processed += result.processed;
    inserted += result.inserted;
    errors += result.errors;
  }

  const finalProgress = Math.min(99, Math.round((processed / totalRows) * 100));
  if (finalProgress !== lastProgress) {
    await updateJob(jobId, { progreso: finalProgress });
  }

  return { totalRows, processed, inserted, errors };
};

const processXlsxFile = async ({ filePath, jobId }) => {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo XLSX no contiene hojas');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    blankrows: false
  });

  if (!rows.length) {
    throw new Error('Archivo XLSX sin datos');
  }

  const headers = rows[0];
  const headerIndex = buildHeaderIndex(headers);
  const dataRows = rows.slice(1);
  const totalRows = dataRows.length;

  if (totalRows === 0) {
    throw new Error('Archivo XLSX sin datos');
  }

  let processed = 0;
  let inserted = 0;
  let errors = 0;
  let lastProgress = -1;
  const fileKeys = new Set();

  for (let offset = 0; offset < dataRows.length; offset += batchSize) {
    const batch = dataRows.slice(offset, offset + batchSize).map((values, idx) => ({
      rowNumber: offset + idx + 2,
      values
    }));
    const result = await processBatch({
      batch,
      headerIndex,
      fileKeys,
      jobId
    });

    processed += result.processed;
    inserted += result.inserted;
    errors += result.errors;

    const progress = Math.min(99, Math.round((processed / totalRows) * 100));
    if (progress !== lastProgress) {
      await updateJob(jobId, { progreso: progress });
      lastProgress = progress;
    }
  }

  return { totalRows, processed, inserted, errors };
};

export const processPortfolioImport = async ({ jobId, data }) => {
  const filePath = data?.file?.path;

  if (!filePath) {
    throw new Error('Archivo no encontrado');
  }

  const extension = path.extname(filePath).toLowerCase();

  const result =
    extension === '.xlsx'
      ? await processXlsxFile({ filePath, jobId })
      : await processCsvFile({ filePath, jobId });

  logInfo('bulk_import.portfolios.summary', {
    jobId,
    total: result.totalRows,
    processed: result.processed,
    inserted: result.inserted,
    errors: result.errors
  });

  return result;
};
