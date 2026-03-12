import IORedis from 'ioredis';
import env from './env.js';

const buildDefaultJobOptions = () => {
  const options = {
    attempts: env.queue.attempts,
    backoff: {
      type: 'exponential',
      delay: env.queue.backoffDelayMs
    },
    removeOnComplete: {
      count: env.queue.removeOnCompleteCount,
      age: env.queue.removeOnCompleteAgeSeconds
    },
    removeOnFail: {
      count: env.queue.removeOnFailCount,
      age: env.queue.removeOnFailAgeSeconds
    }
  };

  if (env.queue.jobTimeoutMs > 0) {
    options.timeout = env.queue.jobTimeoutMs;
  }

  return options;
};

export const queueConfig = {
  name: env.queue.name,
  concurrency: env.queue.concurrency,
  maxActive: env.queue.maxActive,
  lockTtlMs: env.queue.lockTtlMs,
  lockRenewIntervalMs: env.queue.lockRenewIntervalMs,
  lockRetryDelayMs: env.queue.lockRetryDelayMs,
  lockDurationMs: env.queue.lockDurationMs,
  maxStalledCount: env.queue.maxStalledCount,
  defaultJobOptions: buildDefaultJobOptions(),
  limiter:
    env.queue.rateLimitMax > 0 && env.queue.rateLimitDurationMs > 0
      ? {
          max: env.queue.rateLimitMax,
          duration: env.queue.rateLimitDurationMs
        }
      : undefined
};

export const buildQueueConnectionOptions = () => ({
  host: env.redis.host,
  port: env.redis.port,
  username: env.redis.username || undefined,
  password: env.redis.password || undefined,
  db: env.redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(env.redis.tls ? { tls: {} } : {})
});

export const createQueueConnection = () => new IORedis(buildQueueConnectionOptions());
