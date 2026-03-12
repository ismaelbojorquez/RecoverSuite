import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

process.env.MOCK_DB = 'true';

const defaultQuery = async () => {
  throw new Error('pool.query no mockeado');
};

const poolStub = {
  query: defaultQuery,
  connect: async () => ({ query: defaultQuery, release() {} }),
  on() {}
};

global.__POOL_MOCK__ = poolStub;

const sessionId = 99;
const tempDir = path.resolve('.tmp-tests');

const createCsv = async (content) => {
  await fs.mkdir(tempDir, { recursive: true });
  const filePath = path.join(tempDir, 'test.csv');
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
};

test('valida duplicados y estrategia ONLY_NEW', async (t) => {
  const filePath = await createCsv(
    ['numero_credito,producto', 'CR-1,Prod', 'CR-1,Prod'].join('\n')
  );

  const mapping = [
    { column: 'numero_credito', targetType: 'core', targetField: 'credit.numero_credito', action: 'map' },
    { column: 'producto', targetType: 'core', targetField: 'credit.producto', action: 'map' }
  ];

  let updateCalls = 0;

  poolStub.query = async (sql, params) => {
    if (sql.includes('FROM import_sessions')) {
      return {
        rows: [
          {
            id: sessionId,
            portfolio_id: 1,
            created_by: 1,
            filename: 'test.csv',
            file_hash: 'hash',
            file_path: filePath,
            file_meta: { separator: ',' },
            detected_headers: ['numero_credito', 'producto'],
            mapping,
            strategy: 'ONLY_NEW',
            status: 'PENDING',
            saldo_fields_snapshot: { fields: [] }
          }
        ]
      };
    }

    if (sql.includes('lower(numero_credito)') && sql.includes('FROM credits')) {
      // Simula crédito existente para CR-1
      return { rows: [{ numero_credito: 'cr-1' }] };
    }

    if (sql.includes('lower(numero_cliente)') && sql.includes('FROM clients')) {
      return { rows: [] };
    }

    if (sql.startsWith('UPDATE import_sessions')) {
      updateCalls += 1;
      return {
        rows: [
          {
            id: sessionId,
            portfolio_id: 1,
            total_rows: 2,
            valid_rows: 0,
            invalid_rows: 2,
            status: 'VALIDATED',
            error_report_path: null,
            error_report: { format: 'ndjson', count: 2 }
          }
        ]
      };
    }

    throw new Error(`query no esperada: ${sql}`);
  };

  const service = await import('../src/modules/bulk-imports/validator.service.js');

  t.after(async () => {
    poolStub.query = defaultQuery;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const result = await service.validateImportSession({ sessionId });

  assert.equal(result.total_rows ?? result.totalRows, 2);
  assert.equal(result.invalid_rows ?? result.invalidRows, 2);
  assert.equal(updateCalls > 0, true, 'Debe actualizar la sesión');
});
