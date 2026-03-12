import { createHttpError } from '../../utils/http-error.js';
import {
  createCreditService,
  deleteCreditService,
  getCreditByIdService,
  getCreditSummaryService,
  listCreditsService,
  updateCreditService
} from './credits.service.js';
import { ensureUuid } from '../clients/client-id.utils.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const requirePagination = (req) => {
  if (req.query.limit === undefined || req.query.offset === undefined) {
    throw createHttpError(400, 'Los parametros limit y offset son requeridos');
  }

  const limit = parseInteger(req.query.limit);
  const offset = parseInteger(req.query.offset);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Parametro limit invalido');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Parametro offset invalido');
  }

  return {
    limit: Math.min(limit, 100),
    offset
  };
};

export const listCreditsHandler = async (req, res, next) => {
  try {
    const { limit, offset } = requirePagination(req);

    const credits = await listCreditsService({ limit, offset });

    res.status(200).json({ data: credits, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getCreditHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const credit = await getCreditByIdService(id);

    res.status(200).json({ data: credit });
  } catch (err) {
    next(err);
  }
};

export const createCreditHandler = async (req, res, next) => {
  try {
    const {
      cliente_id: clienteIdRaw,
      portafolio_id: portafolioIdRaw,
      numero_credito: numeroCredito,
      producto
    } = req.body || {};

    const clienteId = ensureUuid(clienteIdRaw, 'cliente_id');
    const portafolioId = parseInteger(portafolioIdRaw);

    const credit = await createCreditService({
      clienteId,
      portafolioId,
      numeroCredito,
      producto
    });

    res.status(201).json({ data: credit });
  } catch (err) {
    next(err);
  }
};

export const updateCreditHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const {
      cliente_id: clienteIdRaw,
      portafolio_id: portafolioIdRaw,
      numero_credito: numeroCredito,
      producto
    } = req.body || {};

    const clienteId =
      clienteIdRaw !== undefined ? ensureUuid(clienteIdRaw, 'cliente_id') : undefined;
    const portafolioId =
      portafolioIdRaw !== undefined ? parseInteger(portafolioIdRaw) : undefined;

    const credit = await updateCreditService(id, {
      clienteId,
      portafolioId,
      numeroCredito,
      producto
    });

    res.status(200).json({ data: credit });
  } catch (err) {
    next(err);
  }
};

export const deleteCreditHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);

    await deleteCreditService(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getCreditSummaryHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const summary = await getCreditSummaryService(id);

    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
};
