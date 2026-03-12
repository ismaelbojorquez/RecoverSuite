import { createHttpError } from '../../utils/http-error.js';
import {
  listCreditSaldosService,
  upsertCreditSaldosService
} from './credit-saldos.service.js';

const parseId = (value, label) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
  return parsed;
};

export const listCreditSaldosHandler = async (req, res, next) => {
  try {
    const creditId = parseId(req.params.creditId, 'credit');
    const result = await listCreditSaldosService({ creditId });
    res.status(200).json({ data: result.saldos, credit: result.credit });
  } catch (err) {
    next(err);
  }
};

export const upsertCreditSaldosHandler = async (req, res, next) => {
  try {
    const creditId = parseId(req.params.creditId, 'credit');
    const values = Array.isArray(req.body) ? req.body : req.body?.values;
    if (!values) {
      throw createHttpError(400, 'Body must be an array of saldo values or { values: [] }');
    }
    const result = await upsertCreditSaldosService({ creditId, items: values });
    res.status(200).json({ data: result.saldos, credit: result.credit });
  } catch (err) {
    next(err);
  }
};
