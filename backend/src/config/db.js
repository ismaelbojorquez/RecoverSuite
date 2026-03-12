import env from './env.js';

const buildMockPool = () => {
  const noopQuery = async () => ({ rows: [] });
  return {
    query: noopQuery,
    connect: async () => ({
      query: noopQuery,
      release() {}
    }),
    on() {}
  };
};

let pool;

if (process.env.MOCK_DB === 'true' && global.__POOL_MOCK__) {
  pool = global.__POOL_MOCK__;
} else if (process.env.MOCK_DB === 'true' || env.nodeEnv === 'test') {
  pool = buildMockPool();
} else {
  const pg = await import('pg');
  const pgModule = pg.default || pg;
  const { Pool } = pgModule;

  // Normalize int8 (bigint) to Number when it is safe, so permission
  // and ownership checks comparing ids don't fail due to type mismatch.
  if (pgModule?.types?.setTypeParser) {
    pgModule.types.setTypeParser(20, (value) => {
      if (value === null || value === undefined) {
        return value;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isSafeInteger(parsed) ? parsed : value;
    });
  }

  pool = new Pool({
    host: env.db.host,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    port: env.db.port,
    max: env.db.poolMax,
    idleTimeoutMillis: env.db.idleTimeoutMillis,
    connectionTimeoutMillis: env.db.connectionTimeoutMillis,
    statement_timeout: env.db.statementTimeoutMillis,
    keepAlive: true,
    keepAliveInitialDelayMillis: env.db.keepAliveInitialDelayMillis
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

export default pool;
