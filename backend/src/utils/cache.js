import env from '../config/env.js';
import redisClient from '../config/redis.js';

export const cacheKeys = {
  search: 'cache:search',
  clientDetail: 'cache:client_detail',
  portfolios: 'cache:catalog:portfolios',
  balanceFields: 'cache:catalog:balance_fields'
};

export const buildCacheKey = (prefix, ...parts) =>
  [prefix, ...parts.map((part) => String(part))].join(':');

const isCacheReady = () => redisClient.isOpen;

export const cacheGet = async (key) => {
  if (!isCacheReady()) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (err) {
    console.error('Redis cache read failed', err);
    return null;
  }
};

export const cacheSet = async (key, payload, ttlSeconds) => {
  if (!isCacheReady()) {
    return;
  }

  try {
    const value = JSON.stringify(payload);
    const ttl = Number(ttlSeconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return;
    }

    await redisClient.set(key, value, { EX: ttl });
  } catch (err) {
    console.error('Redis cache write failed', err);
  }
};

export const invalidateByPrefix = async (prefix) => {
  if (!isCacheReady()) {
    return 0;
  }

  let count = 0;

  try {
    for await (const key of redisClient.scanIterator({
      MATCH: `${prefix}*`,
      COUNT: 100
    })) {
      await redisClient.del(key);
      count += 1;
    }
  } catch (err) {
    console.error('Redis cache invalidation failed', err);
  }

  return count;
};

export const invalidateSearchCache = async (portafolioId) => {
  if (!portafolioId) {
    return invalidateByPrefix(cacheKeys.search);
  }

  const specificPrefix = buildCacheKey(cacheKeys.search, portafolioId);
  const globalPrefix = buildCacheKey(cacheKeys.search, 'all');
  const [specificCount, globalCount] = await Promise.all([
    invalidateByPrefix(specificPrefix),
    invalidateByPrefix(globalPrefix)
  ]);
  return specificCount + globalCount;
};

export const invalidateClientDetailCache = async ({ portafolioId, clientId } = {}) => {
  const parts = [];
  if (portafolioId) {
    parts.push(portafolioId);
  }
  if (clientId) {
    parts.push(clientId);
  }

  const prefix = parts.length
    ? buildCacheKey(cacheKeys.clientDetail, ...parts)
    : cacheKeys.clientDetail;

  return invalidateByPrefix(prefix);
};

export const invalidatePortfoliosCache = async () =>
  invalidateByPrefix(cacheKeys.portfolios);

export const invalidateBalanceFieldsCache = async (portafolioId) => {
  const prefix = portafolioId
    ? buildCacheKey(cacheKeys.balanceFields, portafolioId)
    : cacheKeys.balanceFields;
  return invalidateByPrefix(prefix);
};

export const cacheTtl = {
  search: Number(env.cache?.searchTtlSeconds ?? 30),
  clientDetail: Number(env.cache?.clientDetailTtlSeconds ?? 60),
  catalogs: Number(env.cache?.catalogsTtlSeconds ?? 300)
};
