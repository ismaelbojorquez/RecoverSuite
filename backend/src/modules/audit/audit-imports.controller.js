import { createHttpError } from '../../utils/http-error.js';
import { listBulkImportAuditsService } from './audit-imports.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parsePagination = (req, { defaultLimit = 50, maxLimit = 200 } = {}) => {
  const limitRaw = req.query.limit;
  const offsetRaw = req.query.offset;

  const limit = limitRaw === undefined ? defaultLimit : parseInteger(limitRaw);
  const offset = offsetRaw === undefined ? 0 : parseInteger(offsetRaw);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return { limit: Math.min(limit, maxLimit), offset };
};

export const listBulkImportAuditsHandler = async (req, res, next) => {
  try {
    const usuarioId = parseInteger(req.query.usuario_id ?? req.query.user_id);
    const fromRaw = req.query.fecha_inicio ?? req.query.from;
    const toRaw = req.query.fecha_fin ?? req.query.to;

    const from = parseDate(fromRaw);
    const to = parseDate(toRaw);

    if (fromRaw && !from) {
      throw createHttpError(400, 'fecha_inicio invalida');
    }

    if (toRaw && !to) {
      throw createHttpError(400, 'fecha_fin invalida');
    }

    const { limit, offset } = parsePagination(req);

    const audits = await listBulkImportAuditsService({
      usuarioId,
      from,
      to,
      limit,
      offset
    });

    res.status(200).json({ data: audits, limit, offset });
  } catch (err) {
    next(err);
  }
};
