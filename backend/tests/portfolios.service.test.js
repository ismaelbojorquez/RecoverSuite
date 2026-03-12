import { test } from 'node:test';
import assert from 'node:assert/strict';

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

const portfoliosService = await import('../src/modules/portfolios/portfolios.service.js');

test('permite activar o desactivar portafolio', async (t) => {
  poolStub.query = async (sql, params) => {
    if (sql.startsWith('UPDATE portfolios')) {
      return {
        rows: [
          {
            id: params[params.length - 1],
            client_id: null,
            name: 'Portafolio A',
            description: null,
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };
    }

    throw new Error(`query no esperada: ${sql}`);
  };

  t.after(() => {
    poolStub.query = defaultQuery;
  });

  const updated = await portfoliosService.updatePortfolioService(7, { isActive: false });
  assert.equal(updated.id, 7);
  assert.equal(updated.is_active, false);
});

test('devuelve conflicto cuando intenta eliminar portafolio con relaciones', async (t) => {
  poolStub.query = async (sql) => {
    if (sql.startsWith('DELETE FROM portfolios')) {
      const err = new Error('update or delete on table "portfolios" violates foreign key constraint');
      err.code = '23503';
      throw err;
    }

    throw new Error(`query no esperada: ${sql}`);
  };

  t.after(() => {
    poolStub.query = defaultQuery;
  });

  await assert.rejects(
    () => portfoliosService.deletePortfolioService(10),
    (err) =>
      err?.statusCode === 409 &&
      String(err?.message || '').includes('No se puede eliminar el portafolio')
  );
});
