import { createHttpError } from '../../utils/http-error.js';
import {
  createBalanceService,
  deleteBalanceService,
  getBalanceService,
  listBalancesService,
  updateBalanceService
} from './balances.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parsePagination = (req) => {
  if (req.query.limit === undefined && req.query.offset === undefined) {
    return null;
  }

  const limit = parseInteger(req.query.limit);
  const offset = parseInteger(req.query.offset ?? 0);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return { limit: Math.min(limit, 200), offset };
};

export const listBalancesHandler = async (req, res, next) => {
  try {
    const creditoId = parseInteger(req.params.creditoId);
    const pagination = parsePagination(req);

    const balances = await listBalancesService({
      creditoId,
      limit: pagination?.limit,
      offset: pagination?.offset
    });

    res.status(200).json({
      data: balances,
      ...(pagination ? pagination : {})
    });
  } catch (err) {
    next(err);
  }
};

export const getBalanceHandler = async (req, res, next) => {
  try {
    const creditoId = parseInteger(req.params.creditoId);
    const saldoId = parseInteger(req.params.saldoId);

    const saldo = await getBalanceService({ creditoId, saldoId });

    res.status(200).json({ data: saldo });
  } catch (err) {
    next(err);
  }
};

export const createBalanceHandler = async (req, res, next) => {
  try {
    const creditoId = parseInteger(req.params.creditoId);
    const { campo_saldo_id: campoSaldoIdRaw, valor } = req.body || {};

    const campoSaldoId = parseInteger(campoSaldoIdRaw);

    const saldo = await createBalanceService({
      creditoId,
      campoSaldoId,
      valor
    });

    res.status(201).json({ data: saldo });
  } catch (err) {
    next(err);
  }
};

export const updateBalanceHandler = async (req, res, next) => {
  try {
    const creditoId = parseInteger(req.params.creditoId);
    const saldoId = parseInteger(req.params.saldoId);
    const { campo_saldo_id: campoSaldoIdRaw, valor } = req.body || {};

    const campoSaldoId =
      campoSaldoIdRaw !== undefined ? parseInteger(campoSaldoIdRaw) : undefined;

    const saldo = await updateBalanceService({
      creditoId,
      saldoId,
      campoSaldoId,
      valor
    });

    res.status(200).json({ data: saldo });
  } catch (err) {
    next(err);
  }
};

export const deleteBalanceHandler = async (req, res, next) => {
  try {
    const creditoId = parseInteger(req.params.creditoId);
    const saldoId = parseInteger(req.params.saldoId);

    await deleteBalanceService({ creditoId, saldoId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
