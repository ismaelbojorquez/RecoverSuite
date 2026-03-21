import { test } from 'node:test';
import assert from 'node:assert/strict';

const campaignsService = await import('../src/modules/campaigns/campaigns.service.js');

test('resolveCampaignContactAvailability detecta disponibilidad omnicanal desde datos base', () => {
  const availability = campaignsService.resolveCampaignContactAvailability({
    telefono: '5551234567',
    email: 'cliente@example.com',
    linea1: 'Av. Reforma 100',
    ciudad: 'CDMX',
    estado: 'CDMX',
    codigo_postal: '06000'
  });

  assert.deepEqual(availability, {
    LLAMADA: true,
    WHATSAPP: true,
    SMS: true,
    EMAIL: true,
    VISITA: true
  });
});

test('buildCampaignDecisionScoreInput combina snapshot SQL con score Mongo y preserva disponibilidad', () => {
  const payload = campaignsService.buildCampaignDecisionScoreInput(
    {
      scoring_global: '48',
      scoring_llamada: '55',
      scoring_whatsapp: '42',
      scoring_sms: '39',
      scoring_email: '0',
      scoring_visita: '51',
      scoring_riesgo_nivel: 'MEDIO',
      telefono: '5551234567',
      email: '',
      linea1: 'Calle 1'
    },
    {
      scoreGeneral: 62,
      canales: {
        llamada: 70,
        whatsapp: 64
      },
      estrategia: {
        contactPlan: {
          availabilityByChannel: {
            EMAIL: false
          }
        }
      }
    }
  );

  assert.equal(payload.scoreGeneral, 62);
  assert.equal(payload.canales.llamada, 70);
  assert.equal(payload.canales.sms, 39);
  assert.equal(payload.estrategia.contactPlan.availabilityByChannel.LLAMADA, true);
  assert.equal(payload.estrategia.contactPlan.availabilityByChannel.EMAIL, false);
  assert.equal(payload.estrategia.contactPlan.availabilityByChannel.VISITA, true);
});

test('buildCampaignTargetRecord arma la fila exportable con contacto y metricas del canal', () => {
  const record = campaignsService.buildCampaignTargetRecord({
    baseRow: {
      client_id: 'client-1',
      numero_cliente: 'C-100',
      nombre: 'Ana',
      apellido_paterno: 'Lopez',
      portafolio_id: 8,
      telefono: '5551234567',
      email: 'ana@example.com',
      linea1: 'Av. 1',
      ciudad: 'CDMX',
      credit_numbers: 'CR-1, CR-2',
      credit_count: '2',
      scoring_global: '58',
      scoring_riesgo_nivel: 'MEDIO'
    },
    decision: {
      accion: 'CONTACTAR',
      canal: 'WHATSAPP',
      prioridad: 'ALTA',
      razon: 'Canal no explorado'
    },
    clienteScore: {
      scoreGeneral: 61,
      riesgo: 'MEDIO',
      canales: {
        llamada: 50,
        whatsapp: 72,
        sms: 44,
        email: 38,
        visita: 41
      },
      montoDeuda: 8900,
      ultimaActualizacion: new Date('2026-03-20T10:00:00.000Z')
    },
    historyAnalysis: {
      totalAttempts: 4,
      totalFailures: 3,
      totalSuccesses: 1,
      orderedRows: [{ fecha: '2026-03-20T09:00:00.000Z' }],
      stats: {
        WHATSAPP: {
          attempts: 2,
          failAttempts: 1,
          successAttempts: 1
        }
      }
    },
    playbookStep: {
      paso: 2,
      dia: 2,
      accion: 'CONTACTAR',
      due: true
    }
  });

  assert.equal(record.canal_recomendado, 'WHATSAPP');
  assert.equal(record.dato_contacto, '5551234567');
  assert.equal(record.score_canal, 72);
  assert.equal(record.intentos_canal_7d, 2);
  assert.equal(record.creditos, 'CR-1, CR-2');
  assert.equal(record.playbook_paso, 2);
});

test('groupCampaignRecordsByChannel filtra por canal solicitado y ordena por prioridad', () => {
  const grouped = campaignsService.groupCampaignRecordsByChannel(
    [
      {
        canal_recomendado: 'EMAIL',
        prioridad: 'MEDIA',
        score_general: 60,
        cliente_id: 'client-2'
      },
      {
        canal_recomendado: 'EMAIL',
        prioridad: 'ALTA',
        score_general: 40,
        cliente_id: 'client-1'
      },
      {
        canal_recomendado: 'SMS',
        prioridad: 'ALTA',
        score_general: 90,
        cliente_id: 'client-3'
      }
    ],
    ['EMAIL']
  );

  assert.deepEqual(Object.keys(grouped), ['EMAIL']);
  assert.equal(grouped.EMAIL[0].cliente_id, 'client-1');
  assert.equal(grouped.EMAIL[1].cliente_id, 'client-2');
});
