import pool from '../../config/db.js';
import env from '../../config/env.js';
import { createHttpError } from '../../utils/http-error.js';
import { logError, logInfo, logWarn } from '../../utils/structured-logger.js';
import { getImportSessionById, updateImportSession } from './import-sessions.repository.js';
import { detectFileType, streamRows } from './utils/file-parser.js';
import { updateJob } from '../jobs/jobs.repository.js';
import {
  getClientByPublicIdAndPortfolio,
  getClientByNumberAndPortfolio,
  createClient,
  updateClient
} from '../clients/clients.repository.js';
import { createCredit, updateCredit, getCreditByNumberAndPortfolio, findCreditsByNumbers } from '../credits/credits.repository.js';
import { upsertCreditSaldo } from '../credit-saldos/credit-saldos.repository.js';
import { chunkArray } from './utils/batch.js';
import { decideActions, validateConfig } from './decision-engine.js';

const normalizeNumber = (raw) => {
  if (raw === undefined || raw === null) return null;
  let text = String(raw).trim();
  if (!text) return null;
  const isParenNegative = text.startsWith('(') && text.endsWith(')');
  text = text.replace(/[\$,€£]/g, '').replace(/[,\s]/g, '').replace(/[()]/g, '');
  if (!text) return null;
  const num = Number(text);
  if (!Number.isFinite(num)) return null;
  return isParenNegative ? -num : num;
};

const normalizeText = (value) => String(value ?? '').trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const DEFAULT_CREDIT_STATE = 'SIN_ESTADO';
const DEFAULT_CREDIT_PRODUCT = 'SIN_PRODUCTO';
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
  headers.forEach((header, idx) => headerIndex.set(normalizeKey(header), idx));

  return mapping.map((item) => {
    if (item.action === 'ignore') return { ...item, columnIndex: -1 };
    const idx = headerIndex.get(normalizeKey(item.column));
    if (idx === undefined) {
      throw createHttpError(400, `Columna ${item.column} no encontrada en encabezados`);
    }
    return { ...item, columnIndex: idx };
  });
};

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
    saldo: {},
    balance: {}
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
    const value = mapItem.columnIndex >= 0 ? row.values[mapItem.columnIndex] : undefined;

    if (mapItem.targetType === 'saldo_field') {
      record.saldo[mapItem.saldoFieldId] = value;
      return;
    }

    if (mapItem.targetType === 'balance_field') {
      record.balance[mapItem.saldoFieldId] = value;
      return;
    }

    const targetField = mapItem.targetField;
    if (!targetField) return;

    if (targetField.startsWith('credit.')) {
      record.credit[targetField.slice('credit.'.length)] = value;
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
      record.address[targetField.slice('address.'.length)] = value;
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
      record.client[targetField.slice('client.'.length)] = value;
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

const upsertBalance = async ({ client, creditoId, campoSaldoId, valor }) => {
  await client.query(
    `INSERT INTO saldos (credito_id, campo_saldo_id, valor)
     VALUES ($1, $2, $3)
     ON CONFLICT (credito_id, campo_saldo_id)
     DO UPDATE SET valor = EXCLUDED.valor, fecha_actualizacion = NOW()`,
    [creditoId, campoSaldoId, valor]
  );
};

const buildExistingCreditsMap = async ({ portfolioId, numbers }) => {
  const uniqueNumbers = [...new Set(numbers.map((n) => normalizeKey(n)).filter(Boolean))];
  const chunks = chunkArray(uniqueNumbers, 500);
  const map = new Map();

  for (const chunk of chunks) {
    const rows = await findCreditsByNumbers({ portafolioId: portfolioId, numbers: chunk });
    rows.forEach((numero) => {
      map.set(normalizeKey(numero), true);
    });
  }

  return map;
};

const getCreditDetailsCache = new Map(); // scoped per job via clear

const getCreditDetails = async ({ portafolioId, numeroCredito }) => {
  const key = `${portafolioId}|${normalizeKey(numeroCredito)}`;
  if (getCreditDetailsCache.has(key)) {
    return getCreditDetailsCache.get(key);
  }
  const credit = await getCreditByNumberAndPortfolio({
    portafolioId,
    numeroCredito
  });
  getCreditDetailsCache.set(key, credit);
  return credit;
};

const mergeClientInCache = ({ cache, client }) => {
  if (!client) return client;
  if (client.id) {
    cache.clientsByPublicId.set(client.id, client);
  }
  if (client.numero_cliente) {
    cache.clientsByNumber.set(normalizeKey(client.numero_cliente), client);
  }
  return client;
};

const ensureClient = async ({ client, portafolioId, cache }) => {
  const publicId = normalizeText(client?.public_id);
  const numeroCliente = normalizeText(client?.numero_cliente || client?.id_cliente);
  const numeroKey = normalizeKey(numeroCliente);

  if (!numeroCliente) {
    throw new Error('id_cliente/numero_cliente requerido');
  }

  if (publicId) {
    if (cache.clientsByPublicId.has(publicId)) {
      return cache.clientsByPublicId.get(publicId);
    }
    const existing = await getClientByPublicIdAndPortfolio({ publicId, portafolioId });
    if (existing) {
      if (normalizeText(existing.numero_cliente) !== numeroCliente) {
        throw new Error('id_cliente no coincide con public_id en portafolio');
      }
      return mergeClientInCache({ cache, client: existing });
    }
  }

  if (numeroKey && cache.clientsByNumber.has(numeroKey)) {
    return cache.clientsByNumber.get(numeroKey);
  }

  const byNumber = await getClientByNumberAndPortfolio({
    numeroCliente,
    portafolioId
  });
  if (byNumber) {
    const updates = {};
    const nombre = normalizeText(client?.nombre);
    const apellidoPaterno = normalizeText(client?.apellido_paterno);
    const apellidoMaterno = normalizeText(client?.apellido_materno);
    const rfc = normalizeText(client?.rfc) || null;
    const curp = normalizeText(client?.curp) || null;

    if (nombre && nombre !== byNumber.nombre) updates.nombre = nombre;
    if (apellidoPaterno && apellidoPaterno !== byNumber.apellido_paterno) {
      updates.apellidoPaterno = apellidoPaterno;
    }
    if (apellidoMaterno && apellidoMaterno !== byNumber.apellido_materno) {
      updates.apellidoMaterno = apellidoMaterno;
    }
    if (rfc !== byNumber.rfc) updates.rfc = rfc;
    if (curp !== byNumber.curp) updates.curp = curp;

    if (Object.keys(updates).length > 0) {
      const updatedClient = await updateClient(byNumber.id, updates);
      return mergeClientInCache({ cache, client: updatedClient || byNumber });
    }
    return mergeClientInCache({ cache, client: byNumber });
  }

  const nombre = normalizeText(client?.nombre || client?.nombre_completo);
  const apellidoPaterno = normalizeText(client?.apellido_paterno) || 'SIN_APELLIDO';
  const apellidoMaterno = normalizeText(client?.apellido_materno) || 'SIN_APELLIDO';
  if (!nombre) {
    throw new Error('Cliente no existe y falta nombre completo para crearlo');
  }

  try {
    const created = await createClient({
      portafolioId,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      numeroCliente,
      rfc: normalizeText(client?.rfc) || null,
      curp: normalizeText(client?.curp) || null
    });
    return mergeClientInCache({ cache, client: created });
  } catch (err) {
    if (err?.code === '23505') {
      const existing = await getClientByNumberAndPortfolio({
        numeroCliente,
        portafolioId
      });
      if (existing) {
        return mergeClientInCache({ cache, client: existing });
      }
    }
    throw err;
  }
};

const ensureContacts = async ({ clientId, contacts }) => {
  const phones = new Set();
  const emails = new Set();

  const rawPhones = [
    ...(Array.isArray(contacts?.phones) ? contacts.phones : []),
    contacts?.phone
  ].filter((value) => value !== undefined && value !== null);
  const rawEmails = [
    ...(Array.isArray(contacts?.emails) ? contacts.emails : []),
    contacts?.email
  ].filter((value) => value !== undefined && value !== null);

  rawPhones.forEach((value) => {
    splitValues(value).forEach((part) => {
      const normalized = normalizePhone(part);
      if (normalized && isValidPhone(normalized)) {
        phones.add(normalized);
      }
    });
  });

  rawEmails.forEach((value) => {
    splitValues(value).forEach((part) => {
      const normalized = normalizeEmail(part);
      if (normalized && isValidEmail(normalized)) {
        emails.add(normalized);
      }
    });
  });

  const phoneList = Array.from(phones);
  if (phoneList.length) {
    const values = [];
    const placeholders = phoneList.map((phone, index) => {
      const base = index * 2;
      values.push(clientId, phone);
      return `($${base + 1}, $${base + 2})`;
    });
    await pool.query(
      `INSERT INTO client_phones (client_id, telefono)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (client_id, telefono) DO NOTHING`,
      values
    );
  }

  const emailList = Array.from(emails);
  if (emailList.length) {
    const values = [];
    const placeholders = emailList.map((email, index) => {
      const base = index * 2;
      values.push(clientId, email);
      return `($${base + 1}, $${base + 2})`;
    });
    await pool.query(
      `INSERT INTO client_emails (client_id, email)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (client_id, email) DO NOTHING`,
      values
    );
  }
};

const ensureAddresses = async ({ clientId, addresses, address }) => {
  const rawAddresses = Array.isArray(addresses)
    ? addresses
    : address
      ? [address]
      : [];
  if (!rawAddresses.length) return;

  const unique = new Map();

  rawAddresses.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    const normalized = {
      linea1: normalizeText(item.linea1),
      linea2: normalizeText(item.linea2 || ''),
      ciudad: normalizeText(item.ciudad),
      estado: normalizeText(item.estado),
      codigo_postal: normalizeText(item.codigo_postal),
      pais: normalizeText(item.pais || '')
    };

    if (!normalized.linea1 || !normalized.ciudad || !normalized.estado || !normalized.codigo_postal) {
      return;
    }

    const key = [
      normalized.linea1,
      normalized.linea2,
      normalized.ciudad,
      normalized.estado,
      normalized.codigo_postal,
      normalized.pais
    ]
      .map((value) => String(value).toLowerCase())
      .join('|');
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  });

  const addressList = Array.from(unique.values());
  if (!addressList.length) return;

  const values = [];
  const placeholders = addressList.map((item, index) => {
    const base = index * 7;
    values.push(
      clientId,
      item.linea1,
      item.linea2,
      item.ciudad,
      item.estado,
      item.codigo_postal,
      item.pais
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  await pool.query(
    `INSERT INTO client_addresses (client_id, linea1, linea2, ciudad, estado, codigo_postal, pais)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (client_id, linea1, linea2, ciudad, estado, codigo_postal, pais) DO NOTHING`,
    values
  );
};

export const processImportSessionJob = async (job) => {
  const jobId = Number(job.id);
  const { sessionId } = job.data || {};

  if (!sessionId) {
    throw new Error('sessionId requerido');
  }

  const markJob = async (updates) => {
    if (!Number.isInteger(jobId)) return;
    await updateJob(jobId, updates);
  };

  const session = await getImportSessionById(sessionId);
  if (!session) {
    await markJob({ estado: 'error', error: 'Sesion no encontrada', finishedAt: new Date() });
    throw new Error('Sesion no encontrada');
  }

  if (!session.file_path || !session.mapping?.length) {
    await markJob({ estado: 'error', error: 'Sesion incompleta', finishedAt: new Date() });
    throw new Error('Sesion incompleta');
  }

  try {
    await markJob({ estado: 'procesando', progreso: 1 });
    await updateImportSession(session.id, { status: 'RUNNING' });

    const headers = session.detected_headers || [];
    const mappingWithIndexes = ensureMappingIndexes(session.mapping, headers);
    const { type: fileType } = detectFileType({
      filePath: session.file_path,
      originalName: session.filename,
      mimeType: session.file_meta?.mimeType
    });

    const chunkSize = Math.max(1, env.bulkImport?.batchSize || 1000);

    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const totalRows = session.total_rows || 0;
    const saldoSnapshot = session.saldo_fields_snapshot || { fields: [] };
    const saldoFields = new Map(
      (saldoSnapshot.fields || []).map((field) => [Number(field.id), field])
    );
    const balanceFields = new Set(
      session.mapping
        .filter((m) => m.targetType === 'balance_field')
        .map((m) => Number(m.saldoFieldId))
    );
    const cache = {
      clientsByPublicId: new Map(),
      clientsByNumber: new Map()
    };

    // reset credit details cache
    getCreditDetailsCache.clear();

    let lastProgress = 0;

    const processChunk = async (chunk) => {
      if (!chunk.length) return;
      const creditNumbers = chunk
        .map(({ record }) => record.credit?.numero_credito)
        .filter(Boolean);

      const existingCreditsSet = await buildExistingCreditsMap({
        portfolioId: session.portfolio_id,
        numbers: creditNumbers
      });

      const start = Date.now();

      for (const { row, record } of chunk) {
        try {
          record.saldoFieldTypes = Object.fromEntries(
            Array.from(saldoFields.entries()).map(([id, field]) => [id, field.fieldType])
          );
          const decision = decideActions({
            record,
            strategy: session.strategy,
            existingCredit: existingCreditsSet.has(normalizeKey(record.credit?.numero_credito)),
            config: validateConfig(session.import_config || session.file_meta?.importConfig || {})
          });

          if (decision.errors.length) {
            skipped += 1;
            logWarn('import_session.row_decision_failed', {
              sessionId,
              jobId,
              rowNumber: row.rowNumber,
              errors: decision.errors
            });
            continue;
          }

          const normalized = decision.normalized;

          if (decision.creditAction === 'SKIP_CREDIT') {
            skipped += 1;
            continue;
          }

          // client resolution
          let client;
          if (
            decision.clientAction === 'INSERT_CLIENT' ||
            decision.clientAction === 'UPDATE_CLIENT'
          ) {
            client = await ensureClient({
              client: normalized.client,
              portafolioId: session.portfolio_id,
              cache
            });

            await ensureContacts({ clientId: client.internal_id, contacts: normalized.contacts });
            await ensureAddresses({
              clientId: client.internal_id,
              addresses: normalized.addresses,
              address: normalized.address
            });
          }

          let creditRow =
            decision.creditAction === 'UPDATE_CREDIT'
              ? await getCreditDetails({
                  portafolioId: session.portfolio_id,
                  numeroCredito: normalized.credit.numero_credito
                })
              : null;

          if (!creditRow && decision.creditAction === 'UPDATE_CREDIT') {
            skipped += 1;
            continue;
          }

          if (decision.creditAction === 'INSERT_CREDIT') {
            const created = await createCredit({
              clienteId: client?.internal_id,
              portafolioId: session.portfolio_id,
              numeroCredito: normalized.credit.numero_credito,
              producto: normalizeText(normalized.credit.producto) || DEFAULT_CREDIT_PRODUCT,
              estado: DEFAULT_CREDIT_STATE
            });
            creditRow = created;
            inserted += 1;
          } else if (decision.creditAction === 'UPDATE_CREDIT' && creditRow) {
            const updatedCredit = await updateCredit(creditRow.credit_id || creditRow.id, {
              clienteId: client?.internal_id || creditRow.cliente_id,
              numeroCredito: normalized.credit.numero_credito,
              producto: normalized.credit.producto || undefined
            });
            creditRow = updatedCredit || creditRow;
            updated += 1;
          }

          if (!creditRow) {
            skipped += 1;
            continue;
          }

          if (decision.saldosAction === 'UPSERT_SALDOS') {
            for (const [fieldIdRaw, value] of Object.entries(normalized.saldo || {})) {
              const fieldId = Number(fieldIdRaw);
              const field = saldoFields.get(fieldId);
              if (!field) continue;

              await upsertCreditSaldo({
                creditId: creditRow.credit_id || creditRow.id,
                saldoFieldId: fieldId,
                valueText:
                  field.fieldType === 'text' || field.fieldType === 'boolean'
                    ? value === null || value === undefined
                      ? null
                      : String(value)
                    : null,
                valueNumber:
                  field.fieldType === 'number' || field.fieldType === 'currency'
                    ? value === null
                      ? null
                      : Number(value)
                    : null,
                valueDate: field.fieldType === 'date' ? value : null,
                valueTime: field.fieldType === 'time' ? value : null,
                valueDatetime: field.fieldType === 'datetime' ? value : null
              });
            }
          }

          if (balanceFields.size && Object.keys(normalized.balance || {}).length) {
            for (const [fieldIdRaw, rawValue] of Object.entries(normalized.balance || {})) {
              const fieldId = Number(fieldIdRaw);
              if (!balanceFields.has(fieldId)) continue;
              const parsed = normalizeNumber(rawValue);
              if (parsed === null) continue;
              await upsertBalance({
                client: pool,
                creditoId: creditRow.credit_id || creditRow.id,
                campoSaldoId: fieldId,
                valor: parsed
              });
            }
          }
        } catch (rowErr) {
          skipped += 1;
          logWarn('import_session.row_failed', {
            sessionId,
            jobId,
            rowNumber: row.rowNumber,
            message: rowErr?.message
          });
        }
      }

      const durationMs = Date.now() - start;
      const rowsPerSec = durationMs > 0 ? Math.round((chunk.length / durationMs) * 1000) : 0;
      logInfo('import_session.chunk_processed', {
        sessionId,
        jobId,
        chunkSize: chunk.length,
        durationMs,
        rowsPerSec
      });
    };

    const chunk = [];
    for await (const row of streamRows({
      filePath: session.file_path,
      fileType,
      separator: session.file_meta?.separator
    })) {
      processed += 1;
      chunk.push({ row, record: normalizeRecord(mappingWithIndexes, row) });

      if (chunk.length >= chunkSize) {
        await processChunk(chunk.splice(0, chunk.length));
      }

      const progress =
        (session.total_rows || processed) > 0
          ? Math.min(99, Math.round((processed / (session.total_rows || processed)) * 100))
          : 0;
      if (progress !== lastProgress && Number.isInteger(jobId)) {
        await markJob({ progreso: progress });
        lastProgress = progress;
      }
    }
    if (chunk.length) {
      await processChunk(chunk.splice(0, chunk.length));
    }

    const finishedAt = new Date();
    await updateImportSession(session.id, {
      status: 'COMPLETED',
      totalRows: session.total_rows || processed,
      validRows: processed,
      invalidRows: 0,
      inserted,
      updated,
      skipped,
      finished_at: finishedAt
    });

    await markJob({ estado: 'terminado', progreso: 100, finishedAt });
    logInfo('import_session.job.completed', {
      sessionId: session.id,
      jobId,
      processed,
      inserted,
      updated,
      skipped
    });

    return { sessionId: session.id, processed, inserted, updated, skipped };
  } catch (err) {
    const finishedAt = new Date();
    await markJob({
      estado: 'error',
      error: err?.message || 'Error en import session',
      finishedAt
    });

    await updateImportSession(session.id, {
      status: 'FAILED',
      errorReport: { message: err?.message || 'Error en import session' }
    });

    logError('import_session.job.failed', err, { sessionId: session.id, jobId });
    throw err;
  }
};
