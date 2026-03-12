import { createClient } from 'redis';
import env from './env.js';

// Shared Redis client for cache, rate limiting, and future sessions.
const client = createClient({
  socket: {
    host: env.redis.host,
    port: env.redis.port,
    connectTimeout: env.redis.connectTimeoutMs,
    reconnectStrategy: (retries) => {
      const delay = Math.min(
        env.redis.maxRetryDelayMs,
        env.redis.retryDelayMs * (retries + 1)
      );
      return delay;
    },
    ...(env.redis.tls ? { tls: true } : {})
  },
  username: env.redis.username || undefined,
  password: env.redis.password || undefined,
  database: env.redis.db
});

client.on('error', (err) => {
  console.error('Redis client error', err);
});

client.on('reconnecting', () => {
  console.warn('Redis reconnecting...');
});

client.on('ready', () => {
  console.log('Redis client ready');
});

export default client;
