import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.MOCK_DB = 'true';

const poolStub = {
  query: async () => {
    throw new Error('pool.query no mockeado');
  },
  on() {}
};

global.__POOL_MOCK__ = poolStub;

const { runBaseSeeds } = await import('../src/config/seed.js');

test('el seed base es idempotente', async (t) => {
  const calls = [];
  const originalQuery = poolStub.query;
  poolStub.query = async (sql) => {
    calls.push(sql);
    if (sql.includes('RETURNING id')) {
      return { rows: [{ id: calls.length }] };
    }
    return { rows: [] };
  };

  t.after(() => {
    poolStub.query = originalQuery;
  });

  await assert.doesNotReject(() => runBaseSeeds());
  await assert.doesNotReject(() => runBaseSeeds());

  const permisoInserts = calls.filter((sql) => sql.includes('INSERT INTO permissions'));
  assert.ok(permisoInserts.length >= 12, 'Debe intentar insertar permisos base');
  assert.ok(
    calls.some((sql) => sql.includes('ON CONFLICT (key)')),
    'Los permisos se insertan de forma idempotente'
  );
});
