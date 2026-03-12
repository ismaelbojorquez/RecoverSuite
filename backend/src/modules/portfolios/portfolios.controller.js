import { createHttpError } from '../../utils/http-error.js';
import {
  createPortfolioService,
  deletePortfolioService,
  getPortfolioByIdService,
  listPortfoliosService,
  updatePortfolioService
} from './portfolios.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const requirePagination = (req) => {
  if (req.query.limit === undefined || req.query.offset === undefined) {
    throw createHttpError(400, 'Pagination parameters limit and offset are required');
  }

  const limit = parseInteger(req.query.limit);
  const offset = parseInteger(req.query.offset);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return {
    limit: Math.min(limit, 100),
    offset
  };
};

export const listPortfoliosHandler = async (req, res, next) => {
  try {
    const { limit, offset } = requirePagination(req);

    const portfolios = await listPortfoliosService({ limit, offset });

    res.status(200).json({ data: portfolios, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getPortfolioHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const portfolio = await getPortfolioByIdService(id);

    res.status(200).json({ data: portfolio });
  } catch (err) {
    next(err);
  }
};

export const createPortfolioHandler = async (req, res, next) => {
  try {
    const {
      client_id: clientIdRaw,
      name,
      description,
      is_active: isActiveRaw
    } = req.body || {};

    const clientId = parseInteger(clientIdRaw);
    const isActive = parseBoolean(isActiveRaw);

    const portfolio = await createPortfolioService({
      clientId,
      name,
      description,
      isActive
    });

    res.status(201).json({ data: portfolio });
  } catch (err) {
    next(err);
  }
};

export const updatePortfolioHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const {
      client_id: clientIdRaw,
      name,
      description,
      is_active: isActiveRaw
    } = req.body || {};

    const clientId = clientIdRaw !== undefined ? parseInteger(clientIdRaw) : undefined;
    const isActive = parseBoolean(isActiveRaw);

    const portfolio = await updatePortfolioService(id, {
      clientId,
      name,
      description,
      isActive
    });

    res.status(200).json({ data: portfolio });
  } catch (err) {
    next(err);
  }
};

export const deletePortfolioHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);

    await deletePortfolioService(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
