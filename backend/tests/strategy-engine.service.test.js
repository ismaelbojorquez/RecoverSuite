import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const strategyEngine = await import('../src/services/strategyEngine.js');
const { default: ClienteScore } = await import('../src/models/ClienteScore.js');
const { default: ContactHistory } = await import('../src/models/ContactHistory.js');

test('prioriza canal digital no explorado con mejor score', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 58,
      canales: {
        llamada: 52,
        whatsapp: 81,
        sms: 60,
        email: 74,
        visita: 30
      }
    },
    contactHistory: [
      {
        canal: 'SMS',
        resultado: 'SIN_RESPUESTA',
        fecha: '2026-03-19T10:00:00.000Z'
      }
    ]
  });

  assert.deepEqual(result, {
    accion: 'CONTACTAR',
    canal: 'WHATSAPP',
    razon: 'Canal no explorado',
    prioridad: 'ALTA'
  });
});

test('considera llamada cuando todos los canales digitales fallaron', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 45,
      canales: {
        llamada: 66,
        whatsapp: 35,
        sms: 28,
        email: 32,
        visita: 20
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'RECHAZO', fecha: '2026-03-18T10:00:00.000Z' }
    ]
  });

  assert.deepEqual(result, {
    accion: 'CONTACTAR',
    canal: 'LLAMADA',
    razon: 'Canales digitales agotados',
    prioridad: 'ALTA'
  });
});

test('considera visita cuando llamada falló múltiples veces después del agotamiento digital', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 46,
      montoDeuda: 12000,
      canales: {
        llamada: 40,
        whatsapp: 30,
        sms: 20,
        email: 25,
        visita: 55
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'RECHAZO', fecha: '2026-03-18T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-17T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-16T10:00:00.000Z' }
    ]
  });

  assert.deepEqual(result, {
    accion: 'VISITAR',
    canal: 'VISITA',
    razon: 'Visita elegible por score, deuda e intentos fallidos',
    prioridad: 'ALTA'
  });
});

test('no permite visita cuando la deuda no supera el umbral aunque llamada haya fallado múltiples veces', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 58,
      montoDeuda: 2500,
      canales: {
        llamada: 42,
        whatsapp: 34,
        sms: 31,
        email: 29,
        visita: 50
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'RECHAZO', fecha: '2026-03-18T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-17T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-16T10:00:00.000Z' }
    ]
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Visita no permitida: montoDeuda menor o igual al umbral 5000',
    prioridad: 'BAJA'
  });
});

test('detiene cuando la frecuencia es alta y no hay efectividad', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 20,
      canales: {
        llamada: 10,
        whatsapp: 8,
        sms: 12,
        email: 7,
        visita: 5
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T09:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-19T09:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'RECHAZO', fecha: '2026-03-18T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-17T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-16T10:00:00.000Z' },
      { canal: 'VISITA', resultado: 'NO_CONTACTADO', fecha: '2026-03-15T10:00:00.000Z' }
    ]
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Frecuencia alta sin respuesta efectiva',
    prioridad: 'BAJA'
  });
});

test('calcularSiguienteAccion consulta ClienteScore y ContactHistory de los ultimos 7 dias', async () => {
  const originalFindOne = ClienteScore.findOne;
  const originalFind = ContactHistory.find;

  ClienteScore.findOne = () => ({
    lean: async () => ({
      scoreGeneral: 61,
      canales: {
        llamada: 48,
        whatsapp: 72,
        sms: 55,
        email: 65,
        visita: 40
      }
    })
  });

  let receivedFilter = null;
  ContactHistory.find = (filter) => {
    receivedFilter = filter;
    return {
      sort() {
        return {
          lean: async () => [
            { canal: 'SMS', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' }
          ]
        };
      }
    };
  };

  try {
    const clienteId = new mongoose.Types.ObjectId();
    const result = await strategyEngine.calcularSiguienteAccion(clienteId);

    assert.equal(String(receivedFilter.clienteId), String(clienteId));
    assert.equal(receivedFilter.fecha.$gte instanceof Date, true);
    assert.deepEqual(result, {
      accion: 'CONTACTAR',
      canal: 'WHATSAPP',
      razon: 'Canal no explorado',
      prioridad: 'ALTA'
    });
  } finally {
    ClienteScore.findOne = originalFindOne;
    ContactHistory.find = originalFind;
  }
});

test('validateVisitEligibility expone motivos claros cuando visita no cumple reglas', () => {
  const validation = strategyEngine.validateVisitEligibility({
    clienteScore: {
      scoreGeneral: 35,
      montoDeuda: 1500
    },
    historyAnalysis: strategyEngine.analyzeContactHistory([
      { canal: 'WHATSAPP', resultado: 'CONTACTADO', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'SIN_RESPUESTA', fecha: '2026-03-19T10:00:00.000Z' }
    ])
  });

  assert.equal(validation.allowed, false);
  assert.deepEqual(validation.reasons, [
    'scoreGeneral menor a 40',
    'montoDeuda menor o igual al umbral 5000',
    'menos de 3 canales distintos intentados',
    'menos de 5 intentos totales',
    'los últimos intentos no fueron fallidos'
  ]);
});
