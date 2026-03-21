import { test } from 'node:test';
import assert from 'node:assert/strict';

const scoringEngine = await import('../src/modules/dictamenes/scoring.engine.js');

test('calcula snapshot incremental por canal y toma flags del dictamen mas reciente', () => {
  const snapshot = scoringEngine.calculateClientScoringSnapshot([
    {
      gestion_id: 4,
      fecha_gestion: '2026-03-20T10:00:00.000Z',
      medio_contacto: 'VISITA',
      tipo_contacto: 'CONTACTADO',
      score_global: '80',
      score_llamada: '85',
      score_whatsapp: '75',
      score_sms: '70',
      score_email: '72',
      score_visita: '90',
      nivel_riesgo: 'BAJO',
      permitir_contacto: true,
      bloquear_cliente: false,
      recomendar_reintento: true
    },
    {
      gestion_id: 3,
      fecha_gestion: '2026-03-19T10:00:00.000Z',
      medio_contacto: 'SMS',
      tipo_contacto: 'RECHAZO',
      score_global: '70',
      score_llamada: '65',
      score_whatsapp: '55',
      score_sms: '70',
      score_email: '68',
      score_visita: '75',
      nivel_riesgo: 'MEDIO',
      permitir_contacto: false,
      bloquear_cliente: true,
      recomendar_reintento: false
    },
    {
      gestion_id: 2,
      fecha_gestion: '2026-03-18T10:00:00.000Z',
      medio_contacto: 'WHATSAPP',
      tipo_contacto: 'NO_CONTACTADO',
      score_global: '50',
      score_llamada: '55',
      score_whatsapp: '45',
      score_sms: '40',
      score_email: '38',
      score_visita: '60',
      nivel_riesgo: 'MEDIO',
      permitir_contacto: false,
      bloquear_cliente: true,
      recomendar_reintento: false
    },
    {
      gestion_id: 1,
      fecha_gestion: '2026-03-17T10:00:00.000Z',
      medio_contacto: 'LLAMADA',
      tipo_contacto: 'CONTACTADO',
      score_global: '60',
      score_llamada: '55',
      score_whatsapp: '50',
      score_sms: '45',
      score_email: '42',
      score_visita: '65',
      nivel_riesgo: 'MEDIO',
      permitir_contacto: false,
      bloquear_cliente: false,
      recomendar_reintento: false
    }
  ]);

  assert.equal(snapshot.score_global, 17.6);
  assert.equal(snapshot.score_llamada, 26.5);
  assert.equal(snapshot.score_whatsapp, 8.5);
  assert.equal(snapshot.score_sms, 16);
  assert.equal(snapshot.score_email, 0);
  assert.equal(snapshot.score_visita, 37);
  assert.equal(snapshot.scoring_riesgo_nivel, 'ALTO');
  assert.equal(snapshot.scoring_permitir_contacto, true);
  assert.equal(snapshot.scoring_bloquear_cliente, false);
  assert.equal(snapshot.scoring_recomendar_reintento, true);
});

test('limita el aprendizaje adaptativo entre 0 y 100 por canal', () => {
  const snapshot = scoringEngine.calculateClientScoringSnapshot([
    {
      gestion_id: 5,
      fecha_gestion: '2026-03-20T10:00:00.000Z',
      medio_contacto: 'LLAMADA',
      tipo_contacto: 'CONTACTADO',
      score_llamada: '100'
    },
    {
      gestion_id: 4,
      fecha_gestion: '2026-03-19T10:00:00.000Z',
      medio_contacto: 'LLAMADA',
      tipo_contacto: 'CONTACTADO',
      score_llamada: '100'
    },
    {
      gestion_id: 3,
      fecha_gestion: '2026-03-18T10:00:00.000Z',
      medio_contacto: 'LLAMADA',
      tipo_contacto: 'CONTACTADO',
      score_llamada: '100'
    },
    {
      gestion_id: 2,
      fecha_gestion: '2026-03-17T10:00:00.000Z',
      medio_contacto: 'LLAMADA',
      tipo_contacto: 'CONTACTADO',
      score_llamada: '100'
    },
    {
      gestion_id: 1,
      fecha_gestion: '2026-03-16T10:00:00.000Z',
      medio_contacto: 'SMS',
      tipo_contacto: 'NO_CONTACTADO',
      score_sms: '0'
    }
  ]);

  assert.equal(snapshot.score_llamada, 100);
  assert.equal(snapshot.score_sms, 0);
});

test('devuelve snapshot vacio cuando no existen gestiones con dictamen', () => {
  const snapshot = scoringEngine.calculateClientScoringSnapshot([]);

  assert.equal(snapshot.score_global, null);
  assert.equal(snapshot.score_llamada, null);
  assert.equal(snapshot.score_email, null);
  assert.equal(snapshot.scoring_riesgo_nivel, null);
  assert.equal(snapshot.scoring_permitir_contacto, null);
});
