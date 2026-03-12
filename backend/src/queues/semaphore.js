import crypto from 'node:crypto';
import { createQueueConnection } from '../config/queue.js';

const connection = createQueueConnection();

const acquireScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  local max = tonumber(ARGV[3])
  local token = ARGV[4]

  redis.call('ZREMRANGEBYSCORE', key, 0, now - ttl)

  local count = redis.call('ZCARD', key)
  if count < max then
    redis.call('ZADD', key, now, token)
    redis.call('PEXPIRE', key, ttl)
    return 1
  end

  return 0
`;

const refreshScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  local token = ARGV[3]

  local exists = redis.call('ZSCORE', key, token)
  if exists then
    redis.call('ZADD', key, now, token)
    redis.call('PEXPIRE', key, ttl)
    return 1
  end

  return 0
`;

const releaseScript = `
  local key = KEYS[1]
  local token = ARGV[1]
  return redis.call('ZREM', key, token)
`;

export const acquireSemaphore = async ({ key, max, ttlMs }) => {
  if (!max || max <= 0) {
    return null;
  }

  const token = crypto.randomUUID();
  const now = Date.now();

  const result = await connection.eval(acquireScript, 1, key, now, ttlMs, max, token);
  if (result === 1 || result === '1') {
    return token;
  }

  return null;
};

export const refreshSemaphore = async ({ key, token, ttlMs }) => {
  if (!token) {
    return false;
  }

  const now = Date.now();
  const result = await connection.eval(refreshScript, 1, key, now, ttlMs, token);
  return result === 1 || result === '1';
};

export const releaseSemaphore = async ({ key, token }) => {
  if (!token) {
    return;
  }

  await connection.eval(releaseScript, 1, key, token);
};
