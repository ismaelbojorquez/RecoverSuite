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

const service = await import('../src/modules/bulk-imports/bulk-imports.targets.service.js');

test('devuelve targets con saldoFields y balanceFields del portafolio', async (t) => {
  poolStub.query = async (sql, params) => {
    if (sql.includes('FROM portfolios')) {
      return { rows: [{ id: params[0], name: 'Test', description: null, is_active: true }] };
    }
    if (sql.includes('FROM saldo_fields')) {
      return {
        rows: [
          {
            id: 10,
            portfolio_id: params[0],
            key: 'saldo_total',
            label: 'Saldo total',
            field_type: 'number',
            value_type: 'dynamic',
            required: true,
            visible: true,
            order_index: 1
          }
        ]
      };
    }
    if (sql.includes('FROM campos_saldo')) {
      return {
        rows: [
          {
            id: 20,
            portafolio_id: params[0],
            nombre_campo: 'saldo_principal',
            etiqueta_visual: 'Saldo principal',
            tipo_dato: 'number',
            orden: 1,
            es_principal: true,
            activo: true
          },
          {
            id: 21,
            portafolio_id: params[0],
            nombre_campo: 'intereses',
            etiqueta_visual: 'Intereses',
            tipo_dato: 'number',
            orden: 2,
            es_principal: false,
            activo: true
          }
        ]
      };
    }

    throw new Error(`query no esperada: ${sql}`);
  };

  t.after(() => {
    poolStub.query = defaultQuery;
  });

  const result = await service.getImportTargetsService({ portfolioId: 5 });

  assert.equal(result.portfolioId, 5);
  assert.ok(Array.isArray(result.dynamicSaldo.saldoFields));
  assert.equal(result.dynamicSaldo.saldoFields[0].saldoFieldId, 10);
  assert.equal(result.dynamicSaldo.saldoFields[0].type, 'number');
  assert.ok(Array.isArray(result.dynamicSaldo.balanceFields));
  assert.equal(result.dynamicSaldo.primaryBalanceIndex, 0);
  assert.equal(result.dynamicSaldo.balanceFields[0].isPrincipal, true);
  assert.equal(result.ignore.key, 'ignore');

  const clientNumberField = (result.core?.client || []).find(
    (field) => field.path === 'client.numero_cliente'
  );
  assert.ok(clientNumberField, 'Debe incluir client.numero_cliente en targets');
  assert.equal(clientNumberField.required, true);
});
