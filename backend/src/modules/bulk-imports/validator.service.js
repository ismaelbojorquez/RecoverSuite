import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import env from '../../config/env.js';
import { createHttpError } from '../../utils/http-error.js';
import { logInfo } from '../../utils/structured-logger.js';
import { getImportSessionById, updateImportSession } from './import-sessions.repository.js';
import { detectFileType, streamRows } from './utils/file-parser.js';
import { findCreditsByNumbers } from '../credits/credits.repository.js';
import { findClientNumbersByPortfolio } from '../clients/clients.repository.js';

const normalizeText = (value) => String(value ?? '').trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const splitValues = (value) =>
  String(value ?? '')
    .split(/[;,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizePhone = (value) => String(value ?? '').trim().replace(/\D/g, '');
const isValidPhone = (value) => /^\d{6,20}$/.test(value);
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const ADDRESS_FIELDS = new Set([
  'linea1',
  'linea2',
  'ciudad',
  'estado',
  'codigo_postal',
  'pais'
]);

const ensureMappingIndexes = (mapping, headers) => {
  const headerIndex = new Map();
  headers.forEach((header, idx) => {
    headerIndex.set(normalizeKey(header), idx);
  });

  return mapping.map((item) => {
    const colKey = normalizeKey(item.column);
    const idx = headerIndex.get(colKey);
    if (idx === undefined) {
      throw createHttpError(400, `Columna ${item.column} no encontrada en encabezados`);
    }
    return { ...item, columnIndex: idx };
  });
};

const parseNumber = (value) => {
  const normalized = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') return { ok: false };
  const num = Number(normalized);
  return Number.isFinite(num) ? { ok: true, value: num } : { ok: false };
};

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? { ok: false } : { ok: true, value: d };
};

const parseBoolean = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (text === 'true' || text === '1') return { ok: true, value: true };
  if (text === 'false' || text === '0') return { ok: true, value: false };
  return { ok: false };
};

const parseByType = (raw, type) => {
  const normalizedType = (type || '').toLowerCase();
  if (normalizedType === 'number' || normalizedType === 'currency') return parseNumber(raw);
  if (normalizedType === 'date' || normalizedType === 'datetime') return parseDate(raw);
  if (normalizedType === 'boolean') return parseBoolean(raw);
  return { ok: true, value: normalizeText(raw) };
};

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;

const normalizeRecord = (mappingWithIndexes, row) => {
  const record = {
    credit: {},
    client: {},
    contacts: {
      phones: [],
      emails: []
    },
    address: {},
    addresses: [],
    saldo: {}
  };
  const addressColumns = {
    linea1: [],
    linea2: [],
    ciudad: [],
    estado: [],
    codigo_postal: [],
    pais: []
  };

  mappingWithIndexes.forEach((mapItem) => {
    if (mapItem.action === 'ignore') return;
    const value = row.values[mapItem.columnIndex];

    if (mapItem.targetType === 'saldo_field') {
      record.saldo[mapItem.saldoFieldId] = value;
      return;
    }

    if (mapItem.targetType === 'balance_field') {
      record.balance = record.balance || {};
      record.balance[mapItem.saldoFieldId] = value;
      return;
    }

    const targetField = mapItem.targetField;
    if (!targetField) return;

    if (targetField.startsWith('credit.')) {
      const key = targetField.slice('credit.'.length);
      record.credit[key] = value;
      return;
    }

    if (targetField === 'contact.phone' || targetField === 'client.phones[].telefono') {
      record.contacts.phones.push(value);
      return;
    }

    if (targetField === 'contact.email' || targetField === 'client.emails[].email') {
      record.contacts.emails.push(value);
      return;
    }

    if (targetField.startsWith('address.')) {
      const key = targetField.slice('address.'.length);
      record.address[key] = value;
      return;
    }

    if (targetField.startsWith('client.addresses[].')) {
      const key = targetField.slice('client.addresses[].'.length);
      if (ADDRESS_FIELDS.has(key)) {
        addressColumns[key].push(value);
      }
      return;
    }

    if (targetField.startsWith('client.')) {
      const key = targetField.slice('client.'.length);
      record.client[key] = value;
      return;
    }

    if (targetField.startsWith('contact.')) {
      const key = targetField.slice('contact.'.length);
      if (key === 'phone') {
        record.contacts.phones.push(value);
      } else if (key === 'email') {
        record.contacts.emails.push(value);
      }
    }
  });

  const maxAddressCount = Math.max(
    0,
    ...Object.values(addressColumns).map((items) => items.length)
  );
  for (let idx = 0; idx < maxAddressCount; idx += 1) {
    const address = {
      linea1: addressColumns.linea1[idx],
      linea2: addressColumns.linea2[idx],
      ciudad: addressColumns.ciudad[idx],
      estado: addressColumns.estado[idx],
      codigo_postal: addressColumns.codigo_postal[idx],
      pais: addressColumns.pais[idx]
    };
    const hasAnyValue = Object.values(address).some(
      (item) => item !== undefined && item !== null && String(item).trim() !== ''
    );
    if (hasAnyValue) {
      record.addresses.push(address);
    }
  }

  const hasLegacyAddress = Object.values(record.address).some(
    (item) => item !== undefined && item !== null && String(item).trim() !== ''
  );
  if (hasLegacyAddress) {
    record.addresses.push(record.address);
  }

  return record;
};

const validateRow = ({
  row,
  mappingWithIndexes,
  session,
  saldoSnapshot,
  existingCredits,
  existingClientNumbers,
  seenNumbers,
  strategy
}) => {
  const errors = [];
  const record = normalizeRecord(mappingWithIndexes, row);
  const portfolioId = session.portfolio_id;
  const creditNumberRaw = record.credit?.numero_credito;
  const creditNumber = normalizeText(creditNumberRaw);

  if (!creditNumber) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'credit.numero_credito',
      message: 'numero_credito es requerido',
      severity: 'ERROR'
    });
  }

  const portfolioFromRow = record.credit?.portafolio_id || record.credit?.portfolio_id;
  if (portfolioFromRow && Number.parseInt(portfolioFromRow, 10) !== portfolioId) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'credit.portafolio_id',
      message: 'portafolio_id no coincide con la sesión',
      severity: 'ERROR'
    });
  }

  const clientNumber = normalizeText(
    record.client?.numero_cliente || record.client?.id_cliente
  );
  if (!clientNumber) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'client.numero_cliente',
      message: 'id_cliente/numero_cliente es requerido',
      severity: 'ERROR'
    });
  }

  const hasClientName = !!normalizeText(
    record.client?.nombre || record.client?.nombre_completo
  );

  if (
    clientNumber &&
    !existingClientNumbers.has(normalizeKey(clientNumber)) &&
    !hasClientName
  ) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'client.nombre_completo',
      message: 'cliente no existe y falta nombre completo para crearlo',
      severity: 'ERROR'
    });
  }

  if (record.client?.rfc && !RFC_REGEX.test(record.client.rfc)) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'client.rfc',
      message: 'RFC con formato invalido',
      severity: 'WARN'
    });
  }

  if (record.client?.curp && !CURP_REGEX.test(record.client.curp)) {
    errors.push({
      rowNumber: row.rowNumber,
      field: 'client.curp',
      message: 'CURP con formato invalido',
      severity: 'WARN'
    });
  }

  // contacts validation
  const rawPhones = Array.isArray(record.contacts?.phones) ? record.contacts.phones : [];
  rawPhones.forEach((value) => {
    splitValues(value).forEach((part) => {
      const normalized = normalizePhone(part);
      if (!normalized || !isValidPhone(normalized)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'client.phones[].telefono',
          message: 'telefono invalido',
          severity: 'ERROR'
        });
      }
    });
  });

  const rawEmails = Array.isArray(record.contacts?.emails) ? record.contacts.emails : [];
  rawEmails.forEach((value) => {
    splitValues(value).forEach((part) => {
      const normalized = normalizeEmail(part);
      if (!normalized || !isValidEmail(normalized)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'client.emails[].email',
          message: 'email invalido',
          severity: 'ERROR'
        });
      }
    });
  });

  // duplicates within file
  const normalizedKey = normalizeKey(creditNumber);
  if (normalizedKey) {
    if (seenNumbers.has(normalizedKey)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'credit.numero_credito',
        message: 'numero_credito duplicado en archivo',
        severity: 'ERROR'
      });
    } else {
      seenNumbers.add(normalizedKey);
    }
  }

  // strategy vs existing credits
  if (normalizedKey) {
    const exists = existingCredits.has(normalizedKey);
    if (strategy === 'ONLY_NEW' && exists) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'credit.numero_credito',
        message: 'credito ya existe en portafolio (ONLY_NEW)',
        severity: 'ERROR'
      });
    }
    if (strategy === 'ONLY_UPDATE' && !exists) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'credit.numero_credito',
        message: 'credito no existe en portafolio (ONLY_UPDATE)',
        severity: 'ERROR'
      });
    }
  }

  // saldo fields
  const saldoFieldsAllowed = new Map(
    (saldoSnapshot?.fields || []).map((field) => [Number(field.id), field])
  );

  Object.entries(record.saldo || {}).forEach(([fieldIdRaw, rawValue]) => {
    const fieldId = Number(fieldIdRaw);
    const field = saldoFieldsAllowed.get(fieldId);
    if (!field) {
      errors.push({
        rowNumber: row.rowNumber,
        field: `saldo.${fieldId}`,
        message: 'campo de saldo no permitido',
        severity: 'ERROR'
      });
      return;
    }

    const parsed = parseByType(rawValue, field.fieldType);
    if (!parsed.ok) {
      errors.push({
        rowNumber: row.rowNumber,
        field: `saldo.${field.key}`,
        message: 'valor de saldo inválido',
        severity: 'ERROR'
      });
      return;
    }

    if (field.required && (rawValue === undefined || rawValue === null || rawValue === '')) {
      errors.push({
        rowNumber: row.rowNumber,
        field: `saldo.${field.key}`,
        message: 'saldo requerido',
        severity: 'ERROR'
      });
    }
  });

  return { record, errors };
};

export const validateImportSession = async ({ sessionId }) => {
  const session = await getImportSessionById(sessionId);
  if (!session) {
    throw createHttpError(404, 'Sesion no encontrada');
  }

  if (!session.file_path || !session.mapping?.length) {
    throw createHttpError(400, 'Sesion incompleta para validar');
  }

  const headers = session.detected_headers || [];
  const strategy = session.strategy || 'UPSERT';
  const mappingWithIndexes = ensureMappingIndexes(session.mapping, headers);

  const { type: fileType } = detectFileType({
    filePath: session.file_path,
    originalName: session.filename,
    mimeType: session.file_meta?.mimeType
  });

  const chunkSize = Math.max(1, env.bulkImport?.batchSize || 1000);
  let totalRows = 0;
  let invalidRows = 0;
  let errorCount = 0;
  let errorStream = null;
  let reportPath = null;
  const seenNumbers = new Set();

  const flushChunk = async (chunk) => {
    if (!chunk.length) return;
    const creditNumbers = chunk
      .map(({ record }) => record.credit?.numero_credito)
      .filter(Boolean)
      .map(normalizeText);
    const clientNumbers = chunk
      .map(({ record }) => record.client?.numero_cliente || record.client?.id_cliente)
      .filter(Boolean)
      .map(normalizeText);
    const existingCredits = new Set(
      (
        await findCreditsByNumbers({
          portafolioId: session.portfolio_id,
          numbers: creditNumbers
        })
      ).map((n) => normalizeKey(n))
    );
    const existingClientNumbers = new Set(
      (
        await findClientNumbersByPortfolio({
          portafolioId: session.portfolio_id,
          numbers: clientNumbers
        })
      ).map((n) => normalizeKey(n))
    );

    for (const { row, record } of chunk) {
      const result = validateRow({
        row,
        mappingWithIndexes,
        session,
        saldoSnapshot: session.saldo_fields_snapshot,
        existingCredits,
        existingClientNumbers,
        seenNumbers,
        strategy
      });

      const hasError = result.errors.some((err) => (err.severity || 'ERROR') === 'ERROR');
      if (hasError) {
        invalidRows += 1;
      }
      if (result.errors.length) {
        if (!errorStream) {
          const reportsDir = path.resolve(
            process.cwd(),
            env.uploads.dir,
            'import-sessions',
            'reports'
          );
          await fsPromises.mkdir(reportsDir, { recursive: true });
          reportPath = path.join(reportsDir, `session-${sessionId}-validation.ndjson`);
          errorStream = fs.createWriteStream(reportPath, { encoding: 'utf8' });
        }
        result.errors.forEach((err) => {
          errorCount += 1;
          errorStream.write(`${JSON.stringify(err)}\n`);
        });
      }
    }
  };

  const chunk = [];
  for await (const row of streamRows({
    filePath: session.file_path,
    fileType,
    separator: session.file_meta?.separator
  })) {
    totalRows += 1;
    const record = normalizeRecord(mappingWithIndexes, row);
    chunk.push({ row, record });
    if (chunk.length >= chunkSize) {
      await flushChunk(chunk.splice(0, chunk.length));
    }
  }
  if (chunk.length) {
    await flushChunk(chunk.splice(0, chunk.length));
  }

  if (errorStream) {
    await new Promise((resolve) => errorStream.end(resolve));
  }

  const updated = await updateImportSession(session.id, {
    totalRows,
    validRows: totalRows - invalidRows,
    invalidRows,
    status: 'VALIDATED',
    errorReportPath: reportPath,
    errorReport: errorCount
      ? {
          format: 'ndjson',
          count: errorCount,
          path: reportPath
        }
      : null
  });

  logInfo('import_session.validated', {
    sessionId: session.id,
    totalRows,
    invalidRows,
    errors: errorCount
  });

  return updated;
};
