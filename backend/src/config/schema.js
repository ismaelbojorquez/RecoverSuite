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
  '../modules/gestiones/gestiones.schema.sql',
  '../modules/gestiones/resultados.schema.sql',
  '../modules/promesas/promesas.schema.sql',
  '../modules/negotiations/negotiations.schema.sql',
  '../modules/jobs/jobs.schema.sql',
  '../modules/jobs/job-errors.schema.sql',
  '../modules/bulk-imports/import-sessions.schema.sql',
  '../modules/credits/credits.index.sql',
  '../modules/credit-saldos/credit-saldos.index.sql',
  '../modules/audit/audit.schema.sql'
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (err) => {
  const retryCodes = new Set(['57P03', 'ECONNREFUSED']);
  return retryCodes.has(err?.code);
};

const maxAttempts = Number(process.env.SCHEMA_RETRY_ATTEMPTS || 10);
const retryDelayMs = Number(process.env.SCHEMA_RETRY_DELAY_MS || 2000);

export const ensureDatabaseSchema = async () => {
  for (const relativePath of schemaFiles) {
    const fullPath = path.join(__dirname, relativePath);
    const sql = await fs.readFile(fullPath, 'utf8');
    let attempt = 0;
    // Retry per file to handle database startup delays
    // (common in container orchestration)
    while (attempt < maxAttempts) {
      try {
        await pool.query(sql);
        break;
      } catch (err) {
        attempt += 1;
        const finalAttempt = attempt >= maxAttempts;
        if (!shouldRetry(err) || finalAttempt) {
          console.error(`Schema execution failed for ${relativePath}:`, err.message);
          throw err;
        }
        console.warn(
          `Schema execution retry ${attempt}/${maxAttempts} for ${relativePath}: ${err.message}`
        );
        await delay(retryDelayMs);
      }
    }
  }
};
