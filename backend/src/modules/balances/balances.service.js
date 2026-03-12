import { createHttpError } from '../../utils/http-error.js';
import {
  createBalance,
  deleteBalance,
  getBalanceById,
  listBalancesByCredit,
  updateBalance
} from './balances.repository.js';
import { getCreditById } from '../credits/credits.repository.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';

const normalizeValor = (value) => {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Valor es requerido');
  }

  const normalized =
    typeof value === 'number' ? String(value) : String(value).trim();

  if (!/^[-]?\d+(\.\d+)?$/.test(normalized)) {
    throw createHttpError(400, 'Valor invalido');
  }

  return normalized;
};

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Saldo ya existe para este campo');
  }

  throw err;
};

const invalidateClientDetailByCredit = async (creditoId) => {
  const credit = await getCreditById(creditoId);
  if (!credit) {
    return;
  }

  await invalidateClientDetailCache({
    portafolioId: credit.portafolio_id,
    clientId: credit.cliente_id
  });
};

export const listBalancesService = async ({ creditoId, limit, offset }) => {
  ensurePositiveId(creditoId, 'credit');

  return listBalancesByCredit({ creditoId, limit, offset });
};

export const getBalanceService = async ({ creditoId, saldoId }) => {
  ensurePositiveId(creditoId, 'credit');
  ensurePositiveId(saldoId, 'saldo');

  const saldo = await getBalanceById({ creditoId, saldoId });
  if (!saldo) {
    throw createHttpError(404, 'Saldo no encontrado');
  }

  return saldo;
};

export const createBalanceService = async ({ creditoId, campoSaldoId, valor }) => {
  ensurePositiveId(creditoId, 'credit');
  ensurePositiveId(campoSaldoId, 'campo');

  const normalizedValor = normalizeValor(valor);

  try {
    const created = await createBalance({
      creditoId,
      campoSaldoId,
      valor: normalizedValor
    });

    await invalidateClientDetailByCredit(creditoId);

    return created;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateBalanceService = async ({
  creditoId,
  saldoId,
  campoSaldoId,
  valor
}) => {
  ensurePositiveId(creditoId, 'credit');
  ensurePositiveId(saldoId, 'saldo');

  const payload = {};

  if (campoSaldoId !== undefined) {
    ensurePositiveId(campoSaldoId, 'campo');
    payload.campoSaldoId = campoSaldoId;
  }

  if (valor !== undefined) {
    payload.valor = normalizeValor(valor);
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  try {
    const updated = await updateBalance({
      creditoId,
      saldoId,
      ...payload
    });

    if (!updated) {
      throw createHttpError(404, 'Saldo no encontrado');
    }

    await invalidateClientDetailByCredit(creditoId);

    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteBalanceService = async ({ creditoId, saldoId }) => {
  ensurePositiveId(creditoId, 'credit');
  ensurePositiveId(saldoId, 'saldo');

  const deleted = await deleteBalance({ creditoId, saldoId });
  if (!deleted) {
    throw createHttpError(404, 'Saldo no encontrado');
  }

  await invalidateClientDetailByCredit(creditoId);

  return true;
};
