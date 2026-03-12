const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    poolMax: Number(process.env.PG_POOL_MAX || 20),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 2000),
    statementTimeoutMillis: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 0),
    keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_MS || 10000)
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB || 0),
    tls: process.env.REDIS_TLS === 'true',
    connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    retryDelayMs: Number(process.env.REDIS_RETRY_DELAY_MS || 500),
    maxRetryDelayMs: Number(process.env.REDIS_MAX_RETRY_DELAY_MS || 5000)
  },
  mongo: {
    uri: process.env.MONGO_URI || '',
    dbName: process.env.MONGO_DB_NAME || '',
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 20000)
  },
  queue: {
    name: process.env.QUEUE_NAME || 'crm-jobs',
    concurrency: Number(process.env.QUEUE_CONCURRENCY || 10),
    attempts: Number(process.env.QUEUE_ATTEMPTS || 3),
    backoffDelayMs: Number(process.env.QUEUE_BACKOFF_DELAY_MS || 3000),
    lockDurationMs: Number(process.env.QUEUE_LOCK_DURATION_MS || 30000),
    maxStalledCount: Number(process.env.QUEUE_MAX_STALLED_COUNT || 2),
    jobTimeoutMs: Number(process.env.QUEUE_JOB_TIMEOUT_MS || 0),
    removeOnCompleteCount: Number(process.env.QUEUE_REMOVE_ON_COMPLETE_COUNT || 1000),
    removeOnCompleteAgeSeconds: Number(
      process.env.QUEUE_REMOVE_ON_COMPLETE_AGE_SECONDS || 3600
    ),
    removeOnFailCount: Number(process.env.QUEUE_REMOVE_ON_FAIL_COUNT || 5000),
    removeOnFailAgeSeconds: Number(process.env.QUEUE_REMOVE_ON_FAIL_AGE_SECONDS || 86400),
    maxActive: Number(process.env.QUEUE_MAX_ACTIVE || process.env.QUEUE_CONCURRENCY || 10),
    lockTtlMs: Number(
      process.env.QUEUE_LOCK_TTL_MS ||
        process.env.QUEUE_JOB_TIMEOUT_MS ||
        600000
    ),
    lockRenewIntervalMs: Number(process.env.QUEUE_LOCK_RENEW_INTERVAL_MS || 10000),
    lockRetryDelayMs: Number(process.env.QUEUE_LOCK_RETRY_DELAY_MS || 5000),
    rateLimitMax: Number(process.env.QUEUE_RATE_LIMIT_MAX || 0),
    rateLimitDurationMs: Number(process.env.QUEUE_RATE_LIMIT_DURATION_MS || 0)
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || 'storage/uploads',
    maxSizeMb: Number(process.env.UPLOAD_MAX_MB || 50)
  },
  bulkImport: {
    batchSize: Number(process.env.BULK_IMPORT_BATCH_SIZE || 200)
  },
  auth: {
    adminId: process.env.AUTH_ADMIN_ID || 'admin',
    adminEmail: process.env.AUTH_ADMIN_EMAIL || '',
    adminPassword: process.env.AUTH_ADMIN_PASSWORD || ''
  },
  security: {
    passwordSaltRounds: Number(process.env.PASSWORD_SALT_ROUNDS || 12)
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'recoversuite',
    audience: process.env.JWT_AUDIENCE || '',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  cache: {
    searchTtlSeconds: Number(process.env.CACHE_SEARCH_TTL_SECONDS || 30),
    clientDetailTtlSeconds: Number(process.env.CACHE_CLIENT_DETAIL_TTL_SECONDS || 60),
    catalogsTtlSeconds: Number(process.env.CACHE_CATALOG_TTL_SECONDS || 300)
  }
};

export default env;
