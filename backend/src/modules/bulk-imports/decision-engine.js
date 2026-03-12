import { createHttpError } from '../../utils/http-error.js';

const defaultConfig = {
  emptySaldoBehavior: 'null', // 'null' | 'zero'
  trimStrings: true,
  dateFormats: ['ISO']
};

const normalizeText = (value, trim) => {
  const text = String(value ?? '');
  return trim ? text.trim() : text;
};

const parseFullName = (value, trim) => {
  const normalized = normalizeText(value, trim);
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

const splitValues = (value) =>
  String(value ?? '')
    .split(/[;,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizePhone = (value) => String(value ?? '').trim().replace(/\D/g, '');
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const normalizeNumber = (raw) => {
  if (raw === undefined || raw === null) return null;
  let text = String(raw).trim();
  if (!text) return null;

  // Handle accounting negatives "(1234)"
  const isParenNegative = text.startsWith('(') && text.endsWith(')');
  text = text.replace(/[\$,€£]/g, '').replace(/[,\s]/g, '');
  text = text.replace(/[()]/g, '');
  if (!text) return null;

  const num = Number(text);
  if (!Number.isFinite(num)) return null;
  return isParenNegative ? -num : num;
};

const normalizeSaldoValue = ({ raw, fieldType, config }) => {
  const behavior = (config.emptySaldoBehavior || '').toLowerCase() === 'zero' ? 'zero' : 'null';
  const isEmpty = raw === undefined || raw === null || String(raw).trim() === '';

  if (isEmpty) {
    return behavior === 'zero' ? 0 : null;
  }

  const type = (fieldType || '').toLowerCase();
  if (type === 'number' || type === 'currency') return normalizeNumber(raw);
  if (type === 'date' || type === 'datetime') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (type === 'boolean') {
    const text = String(raw).trim().toLowerCase();
    if (text === 'true' || text === '1') return true;
    if (text === 'false' || text === '0') return false;
    return null;
  }
  return normalizeText(raw, config.trimStrings !== false);
};

const normalizeContacts = ({ contacts, config }) => {
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
      if (normalized) {
        phones.add(normalized);
      }
    });
  });

  rawEmails.forEach((value) => {
    splitValues(value).forEach((part) => {
      const normalized = normalizeEmail(part);
      if (normalized) {
        emails.add(normalized);
      }
    });
  });

  return {
    phones: Array.from(phones),
    emails: Array.from(emails)
  };
};

const normalizeAddresses = ({ addresses, address, config }) => {
  const rawAddresses = Array.isArray(addresses)
    ? addresses
    : address
      ? [address]
      : [];

  const unique = new Map();

  rawAddresses.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    const normalized = {
      linea1: normalizeText(item.linea1, config.trimStrings !== false),
      linea2: normalizeText(item.linea2, config.trimStrings !== false),
      ciudad: normalizeText(item.ciudad, config.trimStrings !== false),
      estado: normalizeText(item.estado, config.trimStrings !== false),
      codigo_postal: normalizeText(item.codigo_postal, config.trimStrings !== false),
      pais: normalizeText(item.pais, config.trimStrings !== false)
    };

    const hasAnyValue = Object.values(normalized).some((value) => value);
    if (!hasAnyValue) return;

    const dedupeKey = [
      normalized.linea1,
      normalized.linea2 || '',
      normalized.ciudad,
      normalized.estado,
      normalized.codigo_postal,
      normalized.pais || ''
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join('|');

    if (!unique.has(dedupeKey)) {
      unique.set(dedupeKey, normalized);
    }
  });

  return Array.from(unique.values());
};

const requireClientIdentity = (record) => {
  const hasClientNumber = !!normalizeText(
    record.client?.numero_cliente || record.client?.id_cliente || '',
    true
  );
  const hasPublicId = !!normalizeText(record.client?.public_id || record.client?.cliente_id || record.client?.cliente_public_id || '', true);

  return { hasClientNumber, hasPublicId };
};

export const decideActions = ({
  record,
  strategy,
  existingCredit,
  config = {}
}) => {
  const cfg = { ...defaultConfig, ...(config || {}) };
  const errors = [];
  const strategyUpper = (strategy || 'UPSERT').toUpperCase();

  const { hasClientNumber, hasPublicId } = requireClientIdentity(record);
  if (!hasClientNumber) {
    errors.push('Cliente incompleto: id_cliente/numero_cliente es requerido');
  }

  const creditNumber = normalizeText(record.credit?.numero_credito, cfg.trimStrings !== false);
  if (!creditNumber) {
    errors.push('numero_credito es requerido');
  }

  let creditAction = 'INSERT_CREDIT';
  if (strategyUpper === 'ONLY_NEW' && existingCredit) {
    creditAction = 'SKIP_CREDIT';
  } else if (strategyUpper === 'ONLY_UPDATE' && !existingCredit) {
    creditAction = 'SKIP_CREDIT';
  } else if (existingCredit) {
    creditAction = 'UPDATE_CREDIT';
  }

  let clientAction = 'INSERT_CLIENT';
  if (creditAction === 'SKIP_CREDIT') {
    clientAction = 'SKIP_CLIENT';
  } else if (hasPublicId) {
    clientAction = 'UPDATE_CLIENT';
  }

  const saldosAction = creditAction === 'SKIP_CREDIT' ? 'SKIP_SALDOS' : 'UPSERT_SALDOS';

  // Apply normalization policies
  const normalizedSaldo = {};
  Object.entries(record.saldo || {}).forEach(([fieldId, raw]) => {
    normalizedSaldo[fieldId] = normalizeSaldoValue({
      raw,
      fieldType: record.saldoFieldTypes?.[fieldId],
      config: cfg
    });
  });

  const normalizedCredit = { ...record.credit };
  if (normalizedCredit.numero_credito !== undefined) {
    normalizedCredit.numero_credito = creditNumber;
  }
  if (normalizedCredit.producto !== undefined) {
    normalizedCredit.producto = normalizeText(normalizedCredit.producto, cfg.trimStrings !== false);
  }

  const parsedName = parseFullName(record.client?.nombre_completo, cfg.trimStrings !== false);
  const nombre = normalizeText(record.client?.nombre, cfg.trimStrings !== false) || parsedName.nombre;
  const apellidoPaterno =
    normalizeText(record.client?.apellido_paterno, cfg.trimStrings !== false) || parsedName.apellidoPaterno;
  const apellidoMaterno =
    normalizeText(record.client?.apellido_materno, cfg.trimStrings !== false) || parsedName.apellidoMaterno;

  return {
    clientAction,
    creditAction,
    saldosAction,
    errors,
    normalized: {
      credit: normalizedCredit,
      client: {
        ...record.client,
        numero_cliente: normalizeText(
          record.client?.numero_cliente || record.client?.id_cliente,
          cfg.trimStrings !== false
        ),
        public_id: normalizeText(record.client?.public_id, cfg.trimStrings !== false),
        nombre_completo: normalizeText(record.client?.nombre_completo, cfg.trimStrings !== false),
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        rfc: record.client?.rfc ? normalizeText(record.client.rfc, cfg.trimStrings !== false) : null,
        curp: record.client?.curp ? normalizeText(record.client.curp, cfg.trimStrings !== false) : null
      },
      contacts: normalizeContacts({ contacts: record.contacts, config: cfg }),
      addresses: normalizeAddresses({
        addresses: record.addresses,
        address: record.address,
        config: cfg
      }),
      saldo: normalizedSaldo,
      balance: record.balance
    }
  };
};

export const validateConfig = (config) => {
  const cfg = { ...defaultConfig, ...(config || {}) };
  const validBehavior = ['null', 'zero'];
  if (!validBehavior.includes((cfg.emptySaldoBehavior || '').toLowerCase())) {
    throw createHttpError(400, 'emptySaldoBehavior invalido');
  }
  return cfg;
};
