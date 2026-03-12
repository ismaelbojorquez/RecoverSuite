import { createHttpError } from '../../utils/http-error.js';
import { listCreditSaldos, upsertCreditSaldo } from './credit-saldos.repository.js';
import { getCreditById } from '../credits/credits.repository.js';
import { getSaldoFieldById, listSaldoFieldsByPortfolio } from '../saldo-fields/saldo-fields.repository.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';

const allowedFieldTypes = new Set([
  'text',
  'number',
  'currency',
  'date',
  'time',
  'datetime',
  'boolean'
]);

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const normalizeRawValue = (value) => {
  if (value === undefined) {
    return undefined;
  }
  return value;
};

const normalizeValue = (field, rawValue) => {
  const empty = {
    valueText: null,
    valueNumber: null,
    valueDate: null,
    valueTime: null,
    valueDatetime: null
  };

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    if (field.required && (field.value_type || '').toLowerCase() === 'dynamic') {
      throw createHttpError(400, `Valor requerido para el campo ${field.label}`);
    }
    return empty;
  }

  const fieldType = (field.field_type || '').toLowerCase();
  if (!allowedFieldTypes.has(fieldType)) {
    throw createHttpError(400, 'field_type invalido para el campo');
  }

  switch (fieldType) {
    case 'number':
    case 'currency': {
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric)) {
        throw createHttpError(400, `Valor numerico invalido para ${field.label}`);
      }
      return { ...empty, valueNumber: numeric };
    }
    case 'date': {
      const date = new Date(rawValue);
      if (Number.isNaN(date.getTime())) {
        throw createHttpError(400, `Fecha invalida para ${field.label}`);
      }
      return { ...empty, valueDate: date.toISOString().slice(0, 10) };
    }
    case 'time': {
      const text = String(rawValue).trim();
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
        throw createHttpError(400, `Hora invalida para ${field.label}`);
      }
      return { ...empty, valueTime: text };
    }
    case 'datetime': {
      const date = new Date(rawValue);
      if (Number.isNaN(date.getTime())) {
        throw createHttpError(400, `Fecha y hora invalidas para ${field.label}`);
      }
      return { ...empty, valueDatetime: date.toISOString() };
    }
    case 'boolean': {
      const text = String(rawValue).trim().toLowerCase();
      const truthy = text === 'true' || text === '1';
      const falsy = text === 'false' || text === '0';
      if (!truthy && !falsy) {
        throw createHttpError(400, `Valor booleano invalido para ${field.label}`);
      }
      return { ...empty, valueText: truthy ? 'true' : 'false' };
    }
    case 'text':
    default: {
      return { ...empty, valueText: String(rawValue) };
    }
  }
};

const normalizeItem = async (item, credit) => {
  const saldoFieldId = Number.parseInt(
    item.saldo_field_id ?? item.saldoFieldId ?? item.fieldId,
    10
  );
  ensurePositiveId(saldoFieldId, 'saldo field');

  const field = await getSaldoFieldById({ fieldId: saldoFieldId });
  if (!field) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  const valueType = (field.value_type || '').toLowerCase();
  if (valueType !== 'dynamic' && valueType !== 'calculated') {
    throw createHttpError(400, 'value_type invalido para el campo de saldo');
  }

  if (field.portfolio_id !== credit.portafolio_id) {
    throw createHttpError(400, 'Campo de saldo no pertenece al portafolio del crédito');
  }

  if (valueType === 'calculated') {
    return { saldoFieldId, field, values: null, skip: true };
  }

  const rawValue =
    normalizeRawValue(item.value) ??
    normalizeRawValue(item.valor) ??
    normalizeRawValue(item.value_text) ??
    normalizeRawValue(item.value_number) ??
    normalizeRawValue(item.value_date) ??
    normalizeRawValue(item.value_time) ??
    normalizeRawValue(item.value_datetime);

  const values = normalizeValue(field, rawValue);

  return { saldoFieldId, field, values, skip: false };
};

const invalidateCaches = async (credit) => {
  await invalidateClientDetailCache({
    portafolioId: credit.portafolio_id,
    clientId: credit.cliente_id
  });
};

export const listCreditSaldosService = async ({ creditId }) => {
  ensurePositiveId(creditId, 'credit');

  const credit = await getCreditById(creditId);
  if (!credit) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  const [fields, saldos] = await Promise.all([
    listSaldoFieldsByPortfolio({ portfolioId: credit.portafolio_id }),
    listCreditSaldos({ creditId })
  ]);

  const saldosMap = new Map(saldos.map((item) => [item.saldo_field_id, item]));

  const merged = fields.map((field) => {
    const value = saldosMap.get(field.id);
    const isCalculated = (field.value_type || '').toLowerCase() === 'calculated';
    return {
      ...field,
      value_text: isCalculated ? null : value?.value_text ?? null,
      value_number: isCalculated ? null : value?.value_number ?? null,
      value_date: isCalculated ? null : value?.value_date ?? null,
      value_time: isCalculated ? null : value?.value_time ?? null,
      value_datetime: isCalculated ? null : value?.value_datetime ?? null
    };
  });

  return { saldos: merged, credit };
};

export const upsertCreditSaldosService = async ({ creditId, items }) => {
  ensurePositiveId(creditId, 'credit');

  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, 'Body debe ser un arreglo de valores de saldo');
  }

  const credit = await getCreditById(creditId);
  if (!credit) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  const results = [];

  for (const item of items) {
    const { saldoFieldId, values, skip } = await normalizeItem(item, credit);
    if (skip) {
      continue;
    }
    const updated = await upsertCreditSaldo({
      creditId,
      saldoFieldId,
      ...values
    });
    results.push(updated);
  }

  await invalidateCaches(credit);

  return { saldos: results, credit };
};
