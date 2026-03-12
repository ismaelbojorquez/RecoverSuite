import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import XLSX from 'xlsx';
import env from '../../config/env.js';
import pool from '../../config/db.js';
import { createJobErrors } from '../jobs/job-errors.repository.js';
import { updateJob } from '../jobs/jobs.repository.js';
import { logInfo, logWarn } from '../../utils/structured-logger.js';

const batchSize = Math.max(1, env.bulkImport?.batchSize || 200);
const DEFAULT_CREDIT_STATE = 'SIN_ESTADO';
const DEFAULT_CREDIT_PRODUCT = 'SIN_PRODUCTO';

const baseAliases = {
  portafolio_id: ['portafolio_id', 'portfolio_id', 'portafolio', 'portfolio'],
  cliente_id: ['cliente_id', 'client_id', 'cliente', 'client'],
  numero_credito: ['numero_credito', 'num_credito', 'credito', 'credit_number'],
  producto: ['producto', 'product']
};

const normalizeHeader = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeText = (value) => String(value ?? '').trim();

const normalizeKeyPart = (value) => normalizeText(value).toLowerCase();

const buildCreditKey = (portafolioId, numeroCredito) =>
  `${portafolioId}|${normalizeKeyPart(numeroCredito)}`;

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );

const pushError = (rowErrors, jobId, fila, campo, mensaje) => {
  rowErrors.push({ jobId, fila, campo, mensaje });
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

const buildHeaderIndex = (headers) => {
  const normalized = headers.map(normalizeHeader);
  const headerMap = new Map();
  const duplicates = [];

  normalized.forEach((header, index) => {
    if (!header) {
      return;
    }

    if (headerMap.has(header)) {
      duplicates.push(header);
      return;
    }

    headerMap.set(header, index);
  });

  if (duplicates.length) {
    const unique = [...new Set(duplicates)];
    throw new Error(`Encabezados duplicados: ${unique.join(', ')}`);
  }

  const findAliasIndex = (aliases) => {
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
    const idx = normalized.findIndex((header) => normalizedAliases.includes(header));
    return idx === -1 ? undefined : idx;
  };

  const index = {
    headerMap,
    portafolio_id: findAliasIndex(baseAliases.portafolio_id),
    cliente_id: findAliasIndex(baseAliases.cliente_id),
    numero_credito: findAliasIndex(baseAliases.numero_credito),
    producto: findAliasIndex(baseAliases.producto)
  };

  if (index.portafolio_id === undefined) {
    throw new Error('Columna requerida: portafolio_id');
  }

  if (index.cliente_id === undefined) {
    throw new Error('Columna requerida: cliente_id');
  }

  if (index.numero_credito === undefined) {
    throw new Error('Columna requerida: numero_credito');
  }

  return index;
};

const parseSaldoValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/[^0-9.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') {
    return null;
  }

  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return normalized;
};

const fetchExistingPortfolios = async (client, ids) => {
  if (ids.length === 0) {
    return new Set();
  }

  const values = [];
  const placeholders = ids.map((id, index) => {
    values.push(id);
    return `$${index + 1}`;
  });

  const result = await client.query(
    `SELECT id FROM portfolios WHERE id IN (${placeholders.join(', ')})`,
    values
  );

  return new Set(result.rows.map((row) => row.id));
};

const fetchClients = async (client, ids) => {
  if (ids.length === 0) {
    return new Map();
  }

  const values = [];
  const placeholders = ids.map((id, index) => {
    values.push(id);
    return `$${index + 1}`;
  });

  const result = await client.query(
    `SELECT public_id, id AS internal_id, portafolio_id FROM clients WHERE public_id IN (${placeholders.join(', ')})`,
    values
  );

  return new Map(
    result.rows.map((row) => [
      row.public_id,
      { portafolioId: row.portafolio_id, internalId: row.internal_id }
    ])
  );
};

const fetchExistingCredits = async (client, rows) => {
  if (rows.length === 0) {
    return new Set();
  }

  const values = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 2;
    values.push(row.portafolioId, row.numeroCreditoKey);
    return `($${base + 1}, $${base + 2})`;
  });

  const result = await client.query(
    `SELECT portafolio_id, lower(numero_credito) AS numero_credito
     FROM credits
     WHERE (portafolio_id, lower(numero_credito)) IN (${placeholders.join(', ')})`,
    values
  );

  return new Set(
    result.rows.map((row) => `${row.portafolio_id}|${row.numero_credito}`)
  );
};

const fetchSaldoFields = async (client, portafolioIds) => {
  if (portafolioIds.length === 0) {
    return new Map();
  }

  const result = await client.query(
    `SELECT id, portfolio_id, key, label, field_type, value_type, required, visible
     FROM saldo_fields
     WHERE portfolio_id = ANY($1::bigint[])
       AND value_type = 'dynamic'
       AND visible = TRUE`,
    [portafolioIds]
  );

  const map = new Map();
  result.rows.forEach((row) => {
    const list = map.get(row.portfolio_id) || [];
    list.push(row);
    map.set(row.portfolio_id, list);
  });

  return map;
};

const buildPortfolioConfigs = (portafolioIds, fieldsByPortfolio, headerMap, providedMapping) => {
  const configs = new Map();

  portafolioIds.forEach((portafolioId) => {
    const fields = fieldsByPortfolio.get(portafolioId) || [];
    const mapping = [];
    const missing = [];
    const duplicates = [];

    fields.forEach((field) => {
      const provided = providedMapping?.find(
        (item) => Number(item.fieldId || item.saldo_field_id) === Number(field.id)
      );

      if (provided && provided.column) {
        const normalized = normalizeHeader(provided.column);
        const idx = headerMap.get(normalized);
        if (idx === undefined) {
          missing.push(field.key);
          return;
        }
        mapping.push({
          fieldId: field.id,
          columnIndex: idx,
          fieldType: field.field_type,
          key: field.key
        });
        return;
      }

      const nameKey = normalizeHeader(field.key);
      const labelKey = normalizeHeader(field.label);
      const nameIndex = nameKey ? headerMap.get(nameKey) : undefined;
      const labelIndex = labelKey ? headerMap.get(labelKey) : undefined;

      if (
        nameIndex !== undefined &&
        labelIndex !== undefined &&
        nameIndex !== labelIndex
      ) {
        duplicates.push(field.key);
      }

      const columnIndex = nameIndex !== undefined ? nameIndex : labelIndex;
      if (columnIndex === undefined) {
        missing.push(field.key);
        return;
      }

      mapping.push({
        fieldId: field.id,
        columnIndex,
        fieldType: field.field_type,
        key: field.key
      });
    });

    configs.set(portafolioId, {
      mapping,
      missing,
      duplicates
    });
  });

  return configs;
};

const parseValueByType = (rawValue, fieldType) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  const type = (fieldType || '').toLowerCase();
  switch (type) {
    case 'number':
    case 'currency': {
      const normalized = String(rawValue).replace(/[^0-9.-]/g, '');
      if (!normalized || normalized === '-' || normalized === '.') {
        return null;
      }
      const num = Number(normalized);
      return Number.isFinite(num) ? num : null;
    }
    case 'date': {
      const d = new Date(rawValue);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    case 'time': {
      const text = String(rawValue).trim();
      return /^\d{2}:\d{2}(:\d{2})?$/.test(text) ? text : null;
    }
    case 'datetime': {
      const d = new Date(rawValue);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    case 'boolean': {
      const text = String(rawValue).trim().toLowerCase();
      if (text === 'true' || text === '1') return true;
      if (text === 'false' || text === '0') return false;
      return null;
    }
    case 'text':
    default:
      return String(rawValue).trim();
  }
};

const processBatch = async ({ batch, headerIndex, jobId, saldoMapping }) => {
  const rowErrors = [];
  const candidates = [];
  const seenKeys = new Set();

  batch.forEach(({ rowNumber, values }) => {
    const rawPortafolioId = values[headerIndex.portafolio_id];
    const rawClienteId = values[headerIndex.cliente_id];
    const rawNumeroCredito = values[headerIndex.numero_credito];
    const rawProducto = values[headerIndex.producto];

    const rowData = JSON.stringify({
      portafolio_id: rawPortafolioId ?? '',
      cliente_id: rawClienteId ?? '',
      numero_credito: rawNumeroCredito ?? '',
      producto: rawProducto ?? ''
    });

    const portafolioId = Number.parseInt(rawPortafolioId, 10);
    if (!Number.isInteger(portafolioId) || portafolioId <= 0) {
      pushError(
        rowErrors,
        jobId,
        rowNumber,
        'portafolio_id',
        'portafolio_id invalido'
      );
      return;
    }

    const clienteId = isUuid(rawClienteId) ? rawClienteId.trim() : null;
    if (!clienteId) {
      pushError(rowErrors, jobId, rowNumber, 'cliente_id', 'cliente_id invalido');
      return;
    }

    const numeroCredito = normalizeText(rawNumeroCredito);
    const producto = normalizeText(rawProducto) || DEFAULT_CREDIT_PRODUCT;

    if (!numeroCredito) {
      pushError(
        rowErrors,
        jobId,
        rowNumber,
        'numero_credito',
        'numero_credito es requerido'
      );
      return;
    }

    const key = buildCreditKey(portafolioId, numeroCredito);
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

    candidates.push({
      rowNumber,
      values,
      rowData,
      portafolioId,
      clienteId,
      numeroCredito,
      numeroCreditoKey: normalizeKeyPart(numeroCredito),
      producto,
      estado: DEFAULT_CREDIT_STATE,
      key
    });
  });

  if (!candidates.length) {
    if (rowErrors.length) {
      await createJobErrors(rowErrors);
    }
    return { processed: batch.length, inserted: 0, errors: rowErrors.length };
  }

  const client = await pool.connect();
  let insertedCount = 0;
  let errorCount = rowErrors.length;

  try {
    await client.query('BEGIN');

    const portafolioIds = Array.from(
      new Set(candidates.map((row) => row.portafolioId))
    );
    const clienteIds = Array.from(new Set(candidates.map((row) => row.clienteId)));

    const existingPortfolios = await fetchExistingPortfolios(client, portafolioIds);
    const clientsById = await fetchClients(client, clienteIds);
    const balanceFieldsByPortfolio = await fetchSaldoFields(client, portafolioIds);
    const portfolioConfigs = buildPortfolioConfigs(
      portafolioIds,
      balanceFieldsByPortfolio,
      headerIndex.headerMap,
      saldoMapping
    );

    const existingCreditKeys = await fetchExistingCredits(client, candidates);

    for (let index = 0; index < candidates.length; index += 1) {
      const row = candidates[index];
      const savepoint = `sp_credit_${index + 1}`;

      if (!existingPortfolios.has(row.portafolioId)) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'portafolio_id',
          'portafolio_id no existe'
        );
        continue;
      }

      const clientInfo = clientsById.get(row.clienteId);
      if (!clientInfo) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'cliente_id',
          'cliente_id no existe'
        );
        continue;
      }

      if (clientInfo.portafolioId !== row.portafolioId) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'cliente_id',
          'cliente_id no pertenece al portafolio'
        );
        continue;
      }

      if (existingCreditKeys.has(row.key)) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'numero_credito',
          'credito duplicado en portafolio'
        );
        continue;
      }

      const portfolioConfig = portfolioConfigs.get(row.portafolioId);
      if (portfolioConfig?.missing?.length) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'saldos',
          `faltan columnas de saldo: ${portfolioConfig.missing.join(', ')}`
        );
        continue;
      }

      if (portfolioConfig?.duplicates?.length) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'saldos',
          `columnas duplicadas para saldos: ${portfolioConfig.duplicates.join(', ')}`
        );
        continue;
      }

      const balanceMapping = portfolioConfig?.mapping || [];
      const saldoValues = [];
      let balanceError = null;

      for (let idx = 0; idx < balanceMapping.length; idx += 1) {
        const field = balanceMapping[idx];
        const rawValue = row.values[field.columnIndex];
        const parsed = parseValueByType(rawValue, field.fieldType);

        if (parsed === null || parsed === undefined) {
          balanceError = field.key;
          break;
        }

        saldoValues.push({
          saldoFieldId: field.fieldId,
          value: parsed,
          fieldType: field.fieldType
        });
      }

      if (balanceError) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          balanceError,
          `saldo invalido para ${balanceError}`
        );
        continue;
      }

      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        const creditResult = await client.query(
          `INSERT INTO credits (cliente_id, portafolio_id, numero_credito, producto, estado)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            clientInfo.internalId,
            row.portafolioId,
            row.numeroCredito,
            row.producto,
            row.estado
          ]
        );

        const creditId = creditResult.rows[0]?.id;
        if (!creditId) {
          throw new Error('Error al crear credito');
        }

        if (saldoValues.length) {
          const values = [];
          const placeholders = saldoValues.map((saldo, saldoIndex) => {
            const base = saldoIndex * 7;
            values.push(
              creditId,
              saldo.saldoFieldId,
              saldo.fieldType === 'text' || saldo.fieldType === 'boolean' ? saldo.value : null,
              saldo.fieldType === 'number' || saldo.fieldType === 'currency' ? saldo.value : null,
              saldo.fieldType === 'date' ? saldo.value : null,
              saldo.fieldType === 'time' ? saldo.value : null,
              saldo.fieldType === 'datetime' ? saldo.value : null
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
          });

          await client.query(
            `INSERT INTO credit_saldos (
              credit_id,
              saldo_field_id,
              value_text,
              value_number,
              value_date,
              value_time,
              value_datetime
            )
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (credit_id, saldo_field_id)
            DO UPDATE SET
              value_text = EXCLUDED.value_text,
              value_number = EXCLUDED.value_number,
              value_date = EXCLUDED.value_date,
              value_time = EXCLUDED.value_time,
              value_datetime = EXCLUDED.value_datetime,
              updated_at = NOW()`,
            values
          );
        }

        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        insertedCount += 1;
        existingCreditKeys.add(row.key);
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);

        const message =
          err?.code === '23505'
            ? 'credito duplicado en portafolio'
            : err?.message || 'error al insertar credito';

        pushError(rowErrors, jobId, row.rowNumber, 'general', message);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    pushError(
      rowErrors,
      jobId,
      batch[0]?.rowNumber || 0,
      'general',
      err?.message || 'error en bloque'
    );
  } finally {
    client.release();
  }

  if (rowErrors.length) {
    await createJobErrors(rowErrors);
    errorCount = rowErrors.length;
  }

  return {
    processed: batch.length,
    inserted: insertedCount,
    errors: errorCount
  };
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

const processCsvFile = async ({ filePath, jobId, saldoMapping }) => {
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
      const result = await processBatch({ batch, headerIndex, jobId, saldoMapping });
      processed += result.processed;
      inserted += result.inserted;
      errors += result.errors;
      batch = [];

      const progress = Math.min(99, Math.round((processed / totalRows) * 100));
      if (progress !== lastProgress) {
        await updateJob(jobId, { progreso: progress });
        lastProgress = progress;
      }
    }
  }

  if (batch.length) {
    const result = await processBatch({ batch, headerIndex, jobId });
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

const processXlsxFile = async ({ filePath, jobId, saldoMapping }) => {
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
  const dataRows = rows
    .slice(1)
    .map((values, idx) => ({ rowNumber: idx + 2, values }))
    .filter((row) =>
      row.values.some((value) => String(value ?? '').trim() !== '')
    );
  const totalRows = dataRows.length;

  if (totalRows === 0) {
    throw new Error('Archivo XLSX sin datos');
  }

  let processed = 0;
  let inserted = 0;
  let errors = 0;
  let lastProgress = -1;

  for (let offset = 0; offset < dataRows.length; offset += batchSize) {
    const batch = dataRows.slice(offset, offset + batchSize);
    const result = await processBatch({ batch, headerIndex, jobId, saldoMapping });

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

export const processCreditImport = async ({ jobId, data }) => {
  const filePath = data?.file?.path;
  const saldoMapping = Array.isArray(data?.saldoMapping) ? data.saldoMapping : null;

  if (!filePath) {
    throw new Error('Archivo no encontrado');
  }

  const extension = path.extname(filePath).toLowerCase();

  const result =
    extension === '.xlsx'
      ? await processXlsxFile({ filePath, jobId, saldoMapping })
      : await processCsvFile({ filePath, jobId, saldoMapping });

  logInfo('bulk_import.credits.summary', {
    jobId,
    total: result.totalRows,
    processed: result.processed,
    inserted: result.inserted,
    errors: result.errors
  });

  return result;
};
