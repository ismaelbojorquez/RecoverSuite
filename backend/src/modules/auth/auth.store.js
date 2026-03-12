import redisClient from '../../config/redis.js';

const denylistPrefix = 'auth:denylist';
const refreshPrefix = 'auth:refresh';

const isRedisReady = () => redisClient.isOpen;

const ttlFromExp = (exp) => {
  if (!exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(exp - now, 1);
};

const buildKey = (prefix, jti) => `${prefix}:${jti}`;

export const denylistAccessToken = async (jti, exp) => {
  if (!isRedisReady() || !jti) {
    return false;
  }

  const ttl = ttlFromExp(exp);
  if (!ttl) {
    return false;
  }

  try {
    await redisClient.set(buildKey(denylistPrefix, jti), '1', { EX: ttl });
    return true;
  } catch (err) {
    console.error('Redis denylist write failed', err);
    return false;
  }
};

export const isAccessTokenDenylisted = async (jti) => {
  if (!isRedisReady() || !jti) {
    return false;
  }

  try {
    const exists = await redisClient.exists(buildKey(denylistPrefix, jti));
    return exists === 1;
  } catch (err) {
    console.error('Redis denylist read failed', err);
    return false;
  }
};

export const storeRefreshToken = async (jti, userId, exp) => {
  if (!isRedisReady() || !jti) {
    return false;
  }

  const ttl = ttlFromExp(exp);
  if (!ttl) {
    return false;
  }

  try {
    await redisClient.set(buildKey(refreshPrefix, jti), String(userId || ''), { EX: ttl });
    return true;
  } catch (err) {
    console.error('Redis refresh store failed', err);
    return false;
  }
};

export const isRefreshTokenActive = async (jti) => {
  if (!jti) {
    return false;
  }

  if (!isRedisReady()) {
    return true;
  }

  try {
    const exists = await redisClient.exists(buildKey(refreshPrefix, jti));
    return exists === 1;
  } catch (err) {
    console.error('Redis refresh check failed', err);
    return true;
  }
};

export const revokeRefreshToken = async (jti) => {
  if (!isRedisReady() || !jti) {
    return false;
  }

  try {
    await redisClient.del(buildKey(refreshPrefix, jti));
    return true;
  } catch (err) {
    console.error('Redis refresh revoke failed', err);
    return false;
  }
};
