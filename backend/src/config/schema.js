import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaFiles = [
  '../modules/users/users.schema.sql',
  '../modules/users/users.audit.schema.sql',
  '../modules/permissions/permissions.schema.sql',
  '../modules/groups/groups.schema.sql',
  '../modules/portfolios/portfolios.schema.sql',
  '../modules/clients/clients.schema.sql',
  '../modules/clients/phones.schema.sql',
  '../modules/clients/emails.schema.sql',
  '../modules/clients/addresses.schema.sql',
  '../modules/credits/credits.schema.sql',
  '../modules/saldo-fields/saldo-fields.schema.sql',
  '../modules/saldo-fields/credit-saldos.schema.sql',
  '../modules/balance-fields/balance-fields.schema.sql',
  '../modules/balances/balances.schema.sql',
  '../modules/dictamenes/dictamenes.schema.sql',
  '../modules/gestiones/gestiones.schema.sql',
  '../modules/promesas/promesas.schema.sql',
  '../modules/negotiations/negotiations.schema.sql',
  '../modules/jobs/jobs.schema.sql',
  '../modules/jobs/job-errors.schema.sql',
  '../modules/bulk-imports/import-sessions.schema.sql',
  '../modules/credits/credits.index.sql',
  '../modules/credit-saldos/credit-saldos.index.sql',
  '../modules/audit/audit.schema.sql'
];

const SCHEMA_LOCK_ID = 321654987;
const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (err) => {
  const retryCodes = new Set(['57P03', 'ECONNREFUSED']);
  return retryCodes.has(err?.code);
};

const maxAttempts = Number(process.env.SCHEMA_RETRY_ATTEMPTS || 10);
const retryDelayMs = Number(process.env.SCHEMA_RETRY_DELAY_MS || 2000);

const buildChecksum = (value) =>
  crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');

const readMigrationFile = async (relativePath) => {
  const fullPath = path.join(__dirname, relativePath);
  const sql = await fs.readFile(fullPath, 'utf8');

  return {
    relativePath,
    sql,
    checksum: buildChecksum(sql)
  };
};

const ensureMigrationsTable = async (client) => {
  await client.query(MIGRATIONS_TABLE_SQL);
};

const getAppliedMigration = async (client, name) => {
  const result = await client.query(
    `SELECT name, checksum
     FROM schema_migrations
     WHERE name = $1`,
    [name]
  );

  return result.rows[0] || null;
};

const recordMigration = async (client, { name, checksum }) => {
  await client.query(
    `INSERT INTO schema_migrations (name, checksum, applied_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (name)
     DO UPDATE SET
       checksum = EXCLUDED.checksum,
       updated_at = NOW()`,
    [name, checksum]
  );
};

const applyMigration = async (client, migration) => {
  const appliedMigration = await getAppliedMigration(client, migration.relativePath);
  if (appliedMigration?.checksum === migration.checksum) {
    return { applied: false, reason: 'unchanged' };
  }

  await client.query('BEGIN');

  try {
    await client.query(migration.sql);
    await recordMigration(client, {
      name: migration.relativePath,
      checksum: migration.checksum
    });
    await client.query('COMMIT');

    return {
      applied: true,
      reason: appliedMigration ? 'updated' : 'new'
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
};

const runMigrations = async (client) => {
  await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_ID]);

  try {
    await ensureMigrationsTable(client);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const relativePath of schemaFiles) {
      const migration = await readMigrationFile(relativePath);
      const result = await applyMigration(client, migration);

      if (result.applied) {
        appliedCount += 1;
        console.log(
          `[schema] applied ${migration.relativePath} (${result.reason})`
        );
      } else {
        skippedCount += 1;
      }
    }

    console.log(
      `[schema] complete: ${appliedCount} applied, ${skippedCount} unchanged`
    );
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_ID]);
  }
};

export const ensureDatabaseSchema = async () => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    let client = null;

    try {
      client = await pool.connect();
      await runMigrations(client);
      return;
    } catch (err) {
      attempt += 1;
      const finalAttempt = attempt >= maxAttempts;

      if (!shouldRetry(err) || finalAttempt) {
        console.error('Schema execution failed:', err.message);
        throw err;
      }

      console.warn(
        `Schema execution retry ${attempt}/${maxAttempts}: ${err.message}`
      );
      await delay(retryDelayMs);
    } finally {
      client?.release();
    }
  }
};
