import { createHttpError } from '../../utils/http-error.js';
import { searchGlobalService } from './search.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const searchGlobalHandler = async (req, res, next) => {
  try {
    const hasPortfolioFilter = req.query.portafolio_id !== undefined;
    const portafolioId = hasPortfolioFilter ? parseInteger(req.query.portafolio_id) : null;
    if (
      hasPortfolioFilter &&
      (!Number.isInteger(portafolioId) || portafolioId <= 0)
    ) {
      throw createHttpError(400, 'portafolio_id invalido');
    }

    const query = req.query.q;
    const limit = req.query.limit;

    const results = await searchGlobalService({ portafolioId, query, limit });

    res.status(200).json({ data: results });
  } catch (err) {
    next(err);
  }
};
