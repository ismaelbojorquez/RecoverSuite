import { createHttpError } from '../../utils/http-error.js';
import { cacheGet, cacheKeys, cacheSet, cacheTtl, buildCacheKey } from '../../utils/cache.js';
import { searchGlobal } from './search.repository.js';

const normalizeText = (value) => String(value).trim();

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const clampLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.max(1, Math.min(parsed, 50));
};

export const searchGlobalService = async ({ portafolioId, query, limit }) => {
  if (portafolioId !== null && portafolioId !== undefined) {
    ensurePositiveId(portafolioId, 'portfolio');
  }

  if (!query) {
    throw createHttpError(400, 'query es requerido');
  }

  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < 2) {
    throw createHttpError(400, 'query debe tener al menos 2 caracteres');
  }

  const lowerQuery = normalizedQuery.toLowerCase();
  const nameLike = `%${lowerQuery}%`;
  const creditLike = `%${lowerQuery}%`;
  const emailLike = `%${lowerQuery}%`;
  const resolvedLimit = clampLimit(limit);

  const cacheKey = buildCacheKey(
    cacheKeys.search,
    portafolioId ?? 'all',
    resolvedLimit,
    lowerQuery
  );
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const digits = normalizedQuery.replace(/\D/g, '');
  const phoneLike = digits.length >= 3 ? `%${digits}%` : null;

  const results = await searchGlobal({
    portafolioId,
    nameLike,
    phoneLike,
    creditLike,
    emailLike,
    query: lowerQuery,
    limit: resolvedLimit
  });

  await cacheSet(cacheKey, results, cacheTtl.search);

  return results;
};
