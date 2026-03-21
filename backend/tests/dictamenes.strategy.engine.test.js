import { test } from 'node:test';
import assert from 'node:assert/strict';

const strategyEngine = await import('../src/modules/dictamenes/strategy.engine.js');

test('escala a visita cuando los intentos remotos fallan y existe elegibilidad domiciliaria', () => {
  const snapshot = strategyEngine.calculateClientStrategySnapshot({
    rows: [
      {
        gestion_id: 3,
        fecha_gestion: '2026-03-20T10:00:00.000Z',
        medio_contacto: 'SMS',
        tipo_contacto: 'NO_CONTACTADO',
        permitir_contacto: true,
        bloquear_cliente: false,
        recomendar_reintento: true
      },
      {
        gestion_id: 2,
        fecha_gestion: '2026-03-19T10:00:00.000Z',
        medio_contacto: 'WHATSAPP',
        tipo_contacto: 'NO_CONTACTADO',
        permitir_contacto: true,
        bloquear_cliente: false,
        recomendar_reintento: true
      },
      {
        gestion_id: 1,
        fecha_gestion: '2026-03-18T10:00:00.000Z',
        medio_contacto: 'LLAMADA',
        tipo_contacto: 'INVALIDO',
        permitir_contacto: true,
        bloquear_cliente: false,
        recomendar_reintento: true
      }
    ],
    availabilityContext: {
      hasPhone: true,
      hasEmail: true,
      hasAddress: true
    },
    scoringSnapshot: {
      score_global: 48
    }
  });

  assert.equal(snapshot.strategy_next_best_action, 'ESCALAR_A_VISITA');
  assert.equal(snapshot.strategy_recommended_channel, 'VISITA');
  assert.equal(snapshot.strategy_should_stop_contact, false);
  assert.equal(snapshot.strategy_should_escalate_visit, true);
  assert.equal(snapshot.strategy_visit_eligible, true);
  assert.equal(snapshot.strategy_sequence_step, 5);
  assert.deepEqual(snapshot.strategy_reason_codes, [
    'VISIT_ELIGIBLE',
    'REMOTE_CONTACT_UNSUCCESSFUL',
    'LOW_REMOTE_EFFECTIVENESS'
  ]);
  assert.equal(snapshot.strategy_contact_plan.remoteAttempts, 3);
  assert.equal(snapshot.strategy_contact_plan.remoteEffectiveness, 0);
  assert.equal(snapshot.strategy_contact_plan.remoteUnsuccessfulStreak, 3);
});

test('detiene contacto cuando el ultimo dictamen implica rechazo sin reintento', () => {
  const snapshot = strategyEngine.calculateClientStrategySnapshot({
    rows: [
      {
        gestion_id: 7,
        fecha_gestion: '2026-03-20T12:00:00.000Z',
        medio_contacto: 'EMAIL',
        tipo_contacto: 'RECHAZO',
        permitir_contacto: true,
        bloquear_cliente: false,
        recomendar_reintento: false
      },
      {
        gestion_id: 6,
        fecha_gestion: '2026-03-19T12:00:00.000Z',
        medio_contacto: 'LLAMADA',
        tipo_contacto: 'CONTACTADO',
        permitir_contacto: true,
        bloquear_cliente: false,
        recomendar_reintento: false
      }
    ],
    availabilityContext: {
      hasPhone: true,
      hasEmail: true,
      hasAddress: false
    },
    scoringSnapshot: {
      score_global: 72
    }
  });

  assert.equal(snapshot.strategy_next_best_action, 'DETENER_CONTACTO');
  assert.equal(snapshot.strategy_recommended_channel, null);
  assert.equal(snapshot.strategy_should_stop_contact, true);
  assert.equal(snapshot.strategy_should_escalate_visit, false);
  assert.equal(snapshot.strategy_visit_eligible, false);
  assert.equal(snapshot.strategy_reason_codes.includes('CUSTOMER_REJECTED'), true);
});
