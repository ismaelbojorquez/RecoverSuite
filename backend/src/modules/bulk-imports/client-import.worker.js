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
  portafolio_id: ['portafolio_id', 'portfolio_id', 'portafolio', 'portfolio'],
  numero_cliente: ['numero_cliente', 'num_cliente', 'cliente_numero', 'customer_number'],
  nombre: ['nombre', 'name', 'nombres'],
  nombre_completo: ['nombre_completo', 'nombre completo', 'cliente_nombre_completo'],
  apellido_paterno: ['apellido_paterno', 'apellido paterno', 'apellido1', 'paterno'],
  apellido_materno: ['apellido_materno', 'apellido materno', 'apellido2', 'materno'],
  rfc: ['rfc'],
  curp: ['curp']
};

const addressAliases = {
  linea1: ['linea1', 'direccion', 'direccion_linea1', 'direccion1', 'calle'],
  linea2: ['linea2', 'direccion_linea2', 'direccion2', 'colonia'],
  ciudad: ['ciudad', 'municipio'],
  estado: ['estado', 'provincia'],
  codigo_postal: ['codigo_postal', 'cp', 'postal'],
  pais: ['pais', 'country']
};

const normalizeHeader = (value) =>
  String(value ?? '').replace(/^\uFEFF/, '').trim().toLowerCase();

const normalizeText = (value) => String(value ?? '').trim();
const MISSING_LAST_NAME = '';

const parseFullName = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return { nombre: '', apellidoPaterno: '', apellidoMaterno: '' };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { nombre: tokens[0], apellidoPaterno: '', apellidoMaterno: '' };
  }
  if (tokens.length === 2) {
    return { nombre: tokens[0], apellidoPaterno: tokens[1], apellidoMaterno: '' };
  }

  const apellidoMaterno = tokens.pop();
  const apellidoPaterno = tokens.pop();
  return {
    nombre: tokens.join(' '),
    apellidoPaterno,
    apellidoMaterno
  };
};

const normalizeKeyPart = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, ' ');

const buildClientKey = (portafolioId, numeroClienteKey) =>
  `${portafolioId}|${numeroClienteKey}`;

const splitValues = (value) =>
  String(value ?? '')
    .split(/[;,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizePhone = (value) => String(value ?? '').trim().replace(/\D/g, '');

const isValidPhone = (value) => /^\d{6,20}$/.test(value);

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

const isPhoneHeader = (header) =>
  header.startsWith('telefono') || header.startsWith('tel') || header.startsWith('phone');

const isEmailHeader = (header) =>
  header.startsWith('email') || header.startsWith('correo');

const buildHeaderIndex = (headers) => {
  const normalized = headers.map(normalizeHeader);
  const index = {
    phoneColumns: [],
    emailColumns: [],
    address: null
  };

  const findAliasIndex = (aliases) => {
    const idx = normalized.findIndex((header) => aliases.includes(header));
    return idx === -1 ? undefined : idx;
  };

  Object.entries(headerAliases).forEach(([key, aliases]) => {
    index[key] = findAliasIndex(aliases);
  });

  normalized.forEach((header, idx) => {
    if (isPhoneHeader(header)) {
      index.phoneColumns.push(idx);
    } else if (isEmailHeader(header)) {
      index.emailColumns.push(idx);
    }
  });

  const addressIndex = {};
  Object.entries(addressAliases).forEach(([key, aliases]) => {
    const idx = findAliasIndex(aliases);
    if (idx !== undefined) {
      addressIndex[key] = idx;
    }
  });

  if (Object.keys(addressIndex).length > 0) {
    index.address = addressIndex;
  }

  if (index.portafolio_id === undefined) {
    throw new Error('Columna requerida: portafolio_id');
  }

  if (index.numero_cliente === undefined) {
    throw new Error('Columna requerida: numero_cliente');
  }

  if (index.nombre === undefined && index.nombre_completo === undefined) {
    throw new Error('Columna requerida: nombre_completo');
  }

  return index;
};

const buildRowData = ({
  rawPortafolioId,
  rawNumeroCliente,
  rawNombre,
  rawNombreCompleto,
  rawApellidoP,
  rawApellidoM,
  rawRfc,
  rawCurp,
  rawPhones,
  rawEmails,
  rawAddress
}) =>
  JSON.stringify({
    portafolio_id: rawPortafolioId ?? '',
    numero_cliente: rawNumeroCliente ?? '',
    nombre: rawNombre ?? '',
    nombre_completo: rawNombreCompleto ?? '',
    apellido_paterno: rawApellidoP ?? '',
    apellido_materno: rawApellidoM ?? '',
    rfc: rawRfc ?? '',
    curp: rawCurp ?? '',
    telefonos: rawPhones,
    emails: rawEmails,
    direccion: rawAddress
  });

const pushError = (rowErrors, jobId, fila, campo, mensaje) => {
  rowErrors.push({ jobId, fila, campo, mensaje });
};

const extractContacts = ({ values, headerIndex, rowNumber, jobId, rowData, rowErrors }) => {
  const phoneSet = new Set();
  const emailSet = new Set();

  headerIndex.phoneColumns.forEach((col) => {
    const parts = splitValues(values[col]);
    parts.forEach((phone) => {
      const normalized = normalizePhone(phone);
      if (!normalized || !isValidPhone(normalized)) {
        pushError(rowErrors, jobId, rowNumber, 'telefono', 'telefono invalido');
        return;
      }
      phoneSet.add(normalized);
    });
  });

  headerIndex.emailColumns.forEach((col) => {
    const parts = splitValues(values[col]);
    parts.forEach((email) => {
      const normalized = normalizeEmail(email);
      if (!normalized || !isValidEmail(normalized)) {
        pushError(rowErrors, jobId, rowNumber, 'email', 'email invalido');
        return;
      }
      emailSet.add(normalized);
    });
  });

  let address = null;
  if (headerIndex.address) {
    const getAddressValue = (key) =>
      headerIndex.address[key] !== undefined
        ? normalizeText(values[headerIndex.address[key]])
        : '';

    const linea1 = getAddressValue('linea1');
    const linea2 = getAddressValue('linea2');
    const ciudad = getAddressValue('ciudad');
    const estado = getAddressValue('estado');
    const codigoPostal = getAddressValue('codigo_postal');
    const pais = getAddressValue('pais');

    const hasAddress = [linea1, linea2, ciudad, estado, codigoPostal, pais].some(
      (value) => value
    );

    if (hasAddress) {
      if (!linea1 || !ciudad || !estado || !codigoPostal) {
        pushError(rowErrors, jobId, rowNumber, 'direccion', 'direccion incompleta');
      } else {
        address = {
          linea1,
          linea2: linea2 || '',
          ciudad,
          estado,
          codigo_postal: codigoPostal,
          pais: pais || ''
        };
      }
    }
  }

  return {
    phones: Array.from(phoneSet),
    emails: Array.from(emailSet),
    address
  };
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

const fetchExistingClientKeys = async (client, rows) => {
  if (rows.length === 0) {
    return new Set();
  }

  const values = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 2;
    values.push(row.portafolioId, row.numeroKey);
    return `($${base + 1}, $${base + 2})`;
  });

  const result = await client.query(
    `SELECT portafolio_id,
            lower(numero_cliente) AS numero_cliente
     FROM clients
     WHERE (portafolio_id, lower(numero_cliente))
       IN (${placeholders.join(', ')})`,
    values
  );

  return new Set(
    result.rows.map((row) => buildClientKey(row.portafolio_id, row.numero_cliente))
  );
};

const insertClients = async (client, rows) => {
  if (rows.length === 0) {
    return new Map();
  }

  const values = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 7;
    values.push(
      row.portafolioId,
      row.numeroCliente,
      row.nombre,
      row.apellidoPaterno,
      row.apellidoMaterno,
      row.rfc,
      row.curp
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  const result = await client.query(
    `INSERT INTO clients
      (portafolio_id, numero_cliente, nombre, apellido_paterno, apellido_materno, rfc, curp)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT DO NOTHING
     RETURNING id, portafolio_id, numero_cliente`,
    values
  );

  const map = new Map();
  result.rows.forEach((row) => {
    const key = buildClientKey(row.portafolio_id, normalizeKeyPart(row.numero_cliente));
    map.set(key, row.id);
  });

  return map;
};

const insertPhones = async (client, rows) => {
  if (rows.length === 0) {
    return;
  }

  const chunkSize = 500;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, index) => {
      const base = index * 2;
      values.push(row.clientId, row.telefono);
      return `($${base + 1}, $${base + 2})`;
    });

    await client.query(
      `INSERT INTO client_phones (client_id, telefono)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT DO NOTHING`,
      values
    );
  }
};

const insertEmails = async (client, rows) => {
  if (rows.length === 0) {
    return;
  }

  const chunkSize = 500;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, index) => {
      const base = index * 2;
      values.push(row.clientId, row.email);
      return `($${base + 1}, $${base + 2})`;
    });

    await client.query(
      `INSERT INTO client_emails (client_id, email)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT DO NOTHING`,
      values
    );
  }
};

const insertAddresses = async (client, rows) => {
  if (rows.length === 0) {
    return;
  }

  const chunkSize = 200;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, index) => {
      const base = index * 7;
      values.push(
        row.clientId,
        row.linea1,
        row.linea2,
        row.ciudad,
        row.estado,
        row.codigo_postal,
        row.pais
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
    });

    await client.query(
      `INSERT INTO client_addresses
        (client_id, linea1, linea2, ciudad, estado, codigo_postal, pais)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT DO NOTHING`,
      values
    );
  }
};

const processBatch = async ({ batch, headerIndex, fileKeys, jobId }) => {
  const rowErrors = [];
  const candidates = [];
  const seenKeys = new Set();

  batch.forEach(({ rowNumber, values }) => {
    const rawPortafolioId = values[headerIndex.portafolio_id];
    const rawNumeroCliente = values[headerIndex.numero_cliente];
    const rawNombre = headerIndex.nombre !== undefined ? values[headerIndex.nombre] : '';
    const rawNombreCompleto =
      headerIndex.nombre_completo !== undefined
        ? values[headerIndex.nombre_completo]
        : '';
    const rawApellidoP =
      headerIndex.apellido_paterno !== undefined ? values[headerIndex.apellido_paterno] : '';
    const rawApellidoM =
      headerIndex.apellido_materno !== undefined ? values[headerIndex.apellido_materno] : '';
    const rawRfc = headerIndex.rfc !== undefined ? values[headerIndex.rfc] : '';
    const rawCurp = headerIndex.curp !== undefined ? values[headerIndex.curp] : '';

    const rawPhones = headerIndex.phoneColumns.map((col) => values[col]).filter(Boolean);
    const rawEmails = headerIndex.emailColumns.map((col) => values[col]).filter(Boolean);

    const rawAddress = headerIndex.address
      ? {
          linea1:
            headerIndex.address.linea1 !== undefined
              ? values[headerIndex.address.linea1]
              : '',
          linea2:
            headerIndex.address.linea2 !== undefined
              ? values[headerIndex.address.linea2]
              : '',
          ciudad:
            headerIndex.address.ciudad !== undefined
              ? values[headerIndex.address.ciudad]
              : '',
          estado:
            headerIndex.address.estado !== undefined
              ? values[headerIndex.address.estado]
              : '',
          codigo_postal:
            headerIndex.address.codigo_postal !== undefined
              ? values[headerIndex.address.codigo_postal]
              : '',
          pais:
            headerIndex.address.pais !== undefined
              ? values[headerIndex.address.pais]
              : ''
        }
      : null;

    const rowData = buildRowData({
      rawPortafolioId,
      rawNumeroCliente,
      rawNombre,
      rawNombreCompleto,
      rawApellidoP,
      rawApellidoM,
      rawRfc,
      rawCurp,
      rawPhones,
      rawEmails,
      rawAddress
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

    const numeroCliente = normalizeText(rawNumeroCliente);
    if (!numeroCliente) {
      pushError(rowErrors, jobId, rowNumber, 'numero_cliente', 'numero_cliente requerido');
      return;
    }

    const parsedFullName = parseFullName(rawNombreCompleto);
    const nombre = normalizeText(rawNombre) || parsedFullName.nombre;
    const apellidoPaterno =
      normalizeText(rawApellidoP) || parsedFullName.apellidoPaterno || MISSING_LAST_NAME;
    const apellidoMaterno =
      normalizeText(rawApellidoM) || parsedFullName.apellidoMaterno || MISSING_LAST_NAME;

    if (!nombre) {
      pushError(
        rowErrors,
        jobId,
        rowNumber,
        'nombre_completo',
        'nombre del cliente requerido'
      );
      return;
    }

    const numeroKey = normalizeKeyPart(numeroCliente);
    const key = buildClientKey(portafolioId, numeroKey);

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

    const contacts = extractContacts({
      values,
      headerIndex,
      rowNumber,
      jobId,
      rowData,
      rowErrors
    });

    seenKeys.add(key);
    fileKeys.add(key);

    candidates.push({
      rowNumber,
      key,
      numeroCliente,
      numeroKey,
      portafolioId,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      rfc: normalizeText(rawRfc) || null,
      curp: normalizeText(rawCurp) || null,
      phones: contacts.phones,
      emails: contacts.emails,
      address: contacts.address,
      rowData
    });
  });

  if (candidates.length === 0) {
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

    const portafolioIds = Array.from(new Set(candidates.map((row) => row.portafolioId)));
    const existingPortfolios = await fetchExistingPortfolios(client, portafolioIds);

    const filteredCandidates = [];
    candidates.forEach((row) => {
      if (!existingPortfolios.has(row.portafolioId)) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'portafolio_id',
          'portafolio_id no existe'
        );
        return;
      }
      filteredCandidates.push(row);
    });

    const existingKeys = await fetchExistingClientKeys(client, filteredCandidates);
    const insertCandidates = [];

    filteredCandidates.forEach((row) => {
      if (existingKeys.has(row.key)) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'general',
          'registro duplicado en base'
        );
        return;
      }
      insertCandidates.push(row);
    });

    const insertedMap = await insertClients(client, insertCandidates);
    const phoneRows = [];
    const emailRows = [];
    const addressRows = [];

    insertCandidates.forEach((row) => {
      const clientId = insertedMap.get(row.key);
      if (!clientId) {
        pushError(
          rowErrors,
          jobId,
          row.rowNumber,
          'general',
          'registro duplicado en base'
        );
        return;
      }

      insertedCount += 1;

      row.phones.forEach((phone) => {
        phoneRows.push({ clientId, telefono: phone });
      });

      row.emails.forEach((email) => {
        emailRows.push({ clientId, email });
      });

      if (row.address) {
        addressRows.push({
          clientId,
          ...row.address
        });
      }
    });

    await insertPhones(client, phoneRows);
    await insertEmails(client, emailRows);
    await insertAddresses(client, addressRows);

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

      const progress = Math.min(99, Math.round((processed / totalRows) * 100));
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
  const fileKeys = new Set();

  for (let offset = 0; offset < dataRows.length; offset += batchSize) {
    const batch = dataRows.slice(offset, offset + batchSize);
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

export const processClientImport = async ({ jobId, data }) => {
  const filePath = data?.file?.path;

  if (!filePath) {
    throw new Error('Archivo no encontrado');
  }

  const extension = path.extname(filePath).toLowerCase();

  const result =
    extension === '.xlsx'
      ? await processXlsxFile({ filePath, jobId })
      : await processCsvFile({ filePath, jobId });

  logInfo('bulk_import.clients.summary', {
    jobId,
    total: result.totalRows,
    processed: result.processed,
    inserted: result.inserted,
    errors: result.errors
  });

  return result;
};
