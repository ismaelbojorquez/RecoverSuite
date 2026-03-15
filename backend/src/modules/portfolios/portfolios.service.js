import { createHttpError } from '../../utils/http-error.js';
import {
  createPortfolio,
  deletePortfolio,
  getPortfolioById,
  listPortfolios,
  updatePortfolio
} from './portfolios.repository.js';
import { getSaldoFieldById } from '../saldo-fields/saldo-fields.repository.js';
import {
  buildCacheKey,
  cacheGet,
  cacheKeys,
  cacheSet,
  cacheTtl,
  invalidatePortfoliosCache
} from '../../utils/cache.js';

const normalizeName = (value) => String(value).trim();

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const handleDatabaseError = (err, action = 'update') => {
  if (err?.code === '23503') {
    if (action === 'delete') {
      throw createHttpError(
        409,
        'No se puede eliminar el portafolio porque tiene información relacionada. Desactívalo en su lugar.'
      );
    }
    throw createHttpError(400, 'Referencia inválida para el portafolio');
  }
  throw err;
};

export const listPortfoliosService = async ({ limit, offset }) => {
  const cacheKey = buildCacheKey(cacheKeys.portfolios, limit, offset);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const portfolios = await listPortfolios({ limit, offset });

  await cacheSet(cacheKey, portfolios, cacheTtl.catalogs);

  return portfolios;
};

export const getPortfolioByIdService = async (id) => {
  ensurePositiveId(id, 'portfolio');

  const portfolio = await getPortfolioById(id);
  if (!portfolio) {
    throw createHttpError(404, 'Portfolio not found');
  }

  return portfolio;
};

export const createPortfolioService = async ({
  clientId,
  name,
  description,
  isActive,
  debtTotalSaldoFieldId
}) => {
  if (clientId !== undefined && clientId !== null) {
    ensurePositiveId(clientId, 'client');
  }

  if (!name) {
    throw createHttpError(400, 'Portfolio name is required');
  }

  if (debtTotalSaldoFieldId !== undefined && debtTotalSaldoFieldId !== null) {
    throw createHttpError(
      400,
      'Configura el campo de adeudo total después de crear el portafolio.'
    );
  }

  try {
    const created = await createPortfolio({
      clientId: clientId ?? null,
      name: normalizeName(name),
      description: description ? String(description).trim() : null,
      isActive: isActive !== undefined ? isActive : true,
      debtTotalSaldoFieldId: null
    });

    await invalidatePortfoliosCache();

    return created;
  } catch (err) {
    handleDatabaseError(err, 'create');
  }
};

export const updatePortfolioService = async (id, updates) => {
  ensurePositiveId(id, 'portfolio');
  const current = await getPortfolioById(id);
  if (!current) {
    throw createHttpError(404, 'Portfolio not found');
  }

  const payload = {};

  if (updates.clientId !== undefined) {
    ensurePositiveId(updates.clientId, 'client');
    payload.clientId = updates.clientId;
  }

  if (updates.name !== undefined) {
    if (!updates.name) {
      throw createHttpError(400, 'Portfolio name is required');
    }
    payload.name = normalizeName(updates.name);
  }

  if (updates.description !== undefined) {
    payload.description = updates.description ? String(updates.description).trim() : null;
  }

  if (updates.isActive !== undefined) {
    payload.isActive = updates.isActive;
  }

  if (updates.debtTotalSaldoFieldId !== undefined) {
    if (updates.debtTotalSaldoFieldId === null) {
      payload.debtTotalSaldoFieldId = null;
    } else {
      ensurePositiveId(updates.debtTotalSaldoFieldId, 'saldo field');
      const field = await getSaldoFieldById({ fieldId: updates.debtTotalSaldoFieldId });
      if (!field || field.portfolio_id !== current.id) {
        throw createHttpError(400, 'El campo de adeudo total no pertenece al portafolio.');
      }
      if (!['number', 'currency'].includes(String(field.field_type || '').toLowerCase())) {
        throw createHttpError(
          400,
          'El campo de adeudo total debe ser numérico o monetario.'
        );
      }
      payload.debtTotalSaldoFieldId = updates.debtTotalSaldoFieldId;
    }
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  try {
    const updated = await updatePortfolio(id, payload);

    await invalidatePortfoliosCache();

    return updated;
  } catch (err) {
    handleDatabaseError(err, 'update');
  }
};

export const deletePortfolioService = async (id) => {
  ensurePositiveId(id, 'portfolio');

  try {
    const deleted = await deletePortfolio(id);
    if (!deleted) {
      throw createHttpError(404, 'Portfolio not found');
    }

    await invalidatePortfoliosCache();

    return true;
  } catch (err) {
    handleDatabaseError(err, 'delete');
  }
};
