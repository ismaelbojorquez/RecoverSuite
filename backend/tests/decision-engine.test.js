import { test } from 'node:test';
import assert from 'node:assert/strict';

const engine = await import('../src/modules/bulk-imports/decision-engine.js');

const baseRecord = {
  credit: { numero_credito: 'CR-1', producto: 'P' },
  client: {
    numero_cliente: 'CLI-1',
    nombre: 'Ana',
    apellido_paterno: 'P',
    apellido_materno: 'M'
  },
  contacts: {},
  address: {},
  saldo: {},
  balance: {}
};

test('ONLY_NEW skips existing credit', () => {
  const decision = engine.decideActions({
    record: baseRecord,
    strategy: 'ONLY_NEW',
    existingCredit: true
  });
  assert.equal(decision.creditAction, 'SKIP_CREDIT');
  assert.equal(decision.saldosAction, 'SKIP_SALDOS');
});

test('ONLY_UPDATE requires existing credit', () => {
  const decision = engine.decideActions({
    record: baseRecord,
    strategy: 'ONLY_UPDATE',
    existingCredit: false
  });
  assert.equal(decision.creditAction, 'SKIP_CREDIT');
});

test('requires client number when missing', () => {
  const decision = engine.decideActions({
    record: {
      credit: { numero_credito: 'CR-2', producto: 'P' },
      client: {},
      contacts: {},
      address: {},
      saldo: {},
      balance: {}
    },
    strategy: 'UPSERT',
    existingCredit: false
  });
  assert.ok(decision.errors.length > 0);
});

test('normalizes multiple contacts without duplicates', () => {
  const decision = engine.decideActions({
    record: {
      ...baseRecord,
      contacts: {
        phones: ['55 1234 5678;5512345678', '5512345678'],
        emails: ['Test@Mail.com;test@mail.com']
      }
    },
    strategy: 'UPSERT',
    existingCredit: false
  });

  assert.deepEqual(decision.normalized.contacts.phones, ['5512345678']);
  assert.deepEqual(decision.normalized.contacts.emails, ['test@mail.com']);
});

test('maps client.nombre_completo into internal name fields', () => {
  const decision = engine.decideActions({
    record: {
      ...baseRecord,
      client: {
        numero_cliente: 'CLI-9',
        nombre_completo: 'Maria Fernanda Lopez Soto'
      }
    },
    strategy: 'UPSERT',
    existingCredit: false
  });

  assert.equal(decision.normalized.client.nombre, 'Maria Fernanda');
  assert.equal(decision.normalized.client.apellido_paterno, 'Lopez');
  assert.equal(decision.normalized.client.apellido_materno, 'Soto');
});

test('saldo emptyAsZero converts empty to 0', () => {
  const decision = engine.decideActions({
    record: {
      ...baseRecord,
      saldo: { 1: '' },
      saldoFieldTypes: { 1: 'number' }
    },
    strategy: 'UPSERT',
    existingCredit: false,
    config: { emptySaldoBehavior: 'zero' }
  });
  assert.equal(decision.normalized.saldo['1'], 0);
});
