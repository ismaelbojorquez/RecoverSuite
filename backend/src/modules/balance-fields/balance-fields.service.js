import { createHttpError } from '../../utils/http-error.js';
import {
  createBalanceField,
  deleteBalanceField,
  getBalanceFieldById,
  listBalanceFieldsByPortfolio,
  updateBalanceField
} from './balance-fields.repository.js';
import {
  buildCacheKey,
  cacheGet,
  cacheKeys,
  cacheSet,
  cacheTtl,
  invalidateBalanceFieldsCache,
  invalidateClientDetailCache
} from '../../utils/cache.js';

const allowedTypes = new Set(['number', 'currency']);

const normalizeText = (value) => String(value).trim();

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const normalizeTipoDato = (value) => {
  const tipoDato = normalizeText(value);
  if (!allowedTypes.has(tipoDato)) {
    throw createHttpError(400, 'Tipo de dato invalido');
  }
  return tipoDato;
};

const normalizeOrden = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw createHttpError(400, 'Orden invalido');
  }
  return parsed;
};

export const listBalanceFieldsService = async ({ portafolioId, limit, offset }) => {
  ensurePositiveId(portafolioId, 'portfolio');

  const cacheKey = buildCacheKey(
    cacheKeys.balanceFields,
    portafolioId,
    limit,
    offset
  );
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const fields = await listBalanceFieldsByPortfolio({ portafolioId, limit, offset });

  await cacheSet(cacheKey, fields, cacheTtl.catalogs);

  return fields;
};

export const getBalanceFieldService = async ({ portafolioId, fieldId }) => {
  ensurePositiveId(portafolioId, 'portfolio');
  ensurePositiveId(fieldId, 'field');

  const field = await getBalanceFieldById({ portafolioId, fieldId });
  if (!field) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  return field;
};

export const createBalanceFieldService = async ({
  portafolioId,
  nombreCampo,
  etiquetaVisual,
  tipoDato,
  orden,
  esPrincipal,
  activo
}) => {
  ensurePositiveId(portafolioId, 'portfolio');

  if (!nombreCampo) {
    throw createHttpError(400, 'Nombre de campo es requerido');
  }

  if (!etiquetaVisual) {
    throw createHttpError(400, 'Etiqueta visual es requerida');
  }

  if (!tipoDato) {
    throw createHttpError(400, 'Tipo de dato es requerido');
  }

  const parsedOrden = orden !== undefined ? normalizeOrden(orden) : 0;

  const created = await createBalanceField({
    portafolioId,
    nombreCampo: normalizeText(nombreCampo),
    etiquetaVisual: normalizeText(etiquetaVisual),
    tipoDato: normalizeTipoDato(tipoDato),
    orden: parsedOrden,
    esPrincipal: esPrincipal !== undefined ? esPrincipal : false,
    activo: activo !== undefined ? activo : true
  });

  await invalidateBalanceFieldsCache(portafolioId);
  await invalidateClientDetailCache({ portafolioId });

  return created;
};

export const updateBalanceFieldService = async ({
  portafolioId,
  fieldId,
  nombreCampo,
  etiquetaVisual,
  tipoDato,
  orden,
  esPrincipal,
  activo
}) => {
  ensurePositiveId(portafolioId, 'portfolio');
  ensurePositiveId(fieldId, 'field');

  const payload = {};

  if (nombreCampo !== undefined) {
    if (!nombreCampo) {
      throw createHttpError(400, 'Nombre de campo es requerido');
    }
    payload.nombreCampo = normalizeText(nombreCampo);
  }

  if (etiquetaVisual !== undefined) {
    if (!etiquetaVisual) {
      throw createHttpError(400, 'Etiqueta visual es requerida');
    }
    payload.etiquetaVisual = normalizeText(etiquetaVisual);
  }

  if (tipoDato !== undefined) {
    if (!tipoDato) {
      throw createHttpError(400, 'Tipo de dato es requerido');
    }
    payload.tipoDato = normalizeTipoDato(tipoDato);
  }

  if (orden !== undefined) {
    payload.orden = normalizeOrden(orden);
  }

  if (esPrincipal !== undefined) {
    payload.esPrincipal = esPrincipal;
  }

  if (activo !== undefined) {
    payload.activo = activo;
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  const updated = await updateBalanceField({ portafolioId, fieldId, ...payload });

  if (!updated) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  await invalidateBalanceFieldsCache(portafolioId);
  await invalidateClientDetailCache({ portafolioId });

  return updated;
};

export const deleteBalanceFieldService = async ({ portafolioId, fieldId }) => {
  ensurePositiveId(portafolioId, 'portfolio');
  ensurePositiveId(fieldId, 'field');

  const deleted = await deleteBalanceField({ portafolioId, fieldId });
  if (!deleted) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  await invalidateBalanceFieldsCache(portafolioId);
  await invalidateClientDetailCache({ portafolioId });

  return true;
};
