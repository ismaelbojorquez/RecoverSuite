import { createHttpError } from '../../utils/http-error.js';
import { listJobErrorsService } from './job-errors.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parsePagination = (req, { defaultLimit, maxLimit }) => {
  const limitRaw = req.query.limit;
  const offsetRaw = req.query.offset;

  const limit =
    limitRaw === undefined ? defaultLimit : parseInteger(limitRaw);
  const offset =
    offsetRaw === undefined ? 0 : parseInteger(offsetRaw);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return {
    limit: Math.min(limit, maxLimit),
    offset
  };
};

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildCsv = (rows) => {
  const header = ['job_id', 'fila', 'campo', 'mensaje'].join(',');
  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.job_id),
      escapeCsvValue(row.fila),
      escapeCsvValue(row.campo),
      escapeCsvValue(row.mensaje)
    ].join(',')
  );

  return [header, ...lines].join('\n');
};

export const listJobErrorsHandler = async (req, res, next) => {
  try {
    const jobId = parseInteger(req.params.jobId);
    const { limit, offset } = parsePagination(req, {
      defaultLimit: 500,
      maxLimit: 5000
    });

    const errors = await listJobErrorsService({ jobId, limit, offset });

    res.status(200).json({ data: errors, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const exportJobErrorsCsvHandler = async (req, res, next) => {
  try {
    const jobId = parseInteger(req.params.jobId);
    const { limit, offset } = parsePagination(req, {
      defaultLimit: 5000,
      maxLimit: 20000
    });

    const errors = await listJobErrorsService({ jobId, limit, offset });
    const csv = buildCsv(errors);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="job-${jobId}-errors.csv"`
    );
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};
