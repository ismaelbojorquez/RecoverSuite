import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const strategyEngine = await import('../src/services/strategyEngine.js');
const { default: ClienteScore } = await import('../src/models/ClienteScore.js');
const { default: ContactHistory } = await import('../src/models/ContactHistory.js');

test('respeta el playbook base en día 1 y prioriza WhatsApp', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 58,
      canales: {
        llamada: 52,
        whatsapp: 61,
        sms: 60,
        email: 88,
        visita: 30
      }
    },
    contactHistory: [],
    now: new Date('2026-03-20T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'CONTACTAR',
    canal: 'WHATSAPP',
    razon: 'Playbook base día 1',
    prioridad: 'ALTA'
  });
});

test('usa el playbook para llevar el contacto a llamada en día 3', () => {
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
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-21T10:00:00.000Z' }
    ],
    now: new Date('2026-03-22T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'CONTACTAR',
    canal: 'LLAMADA',
    razon: 'Playbook base día 3',
    prioridad: 'ALTA'
  });
});

test('evalúa visita en día 10 del playbook cuando cumple elegibilidad', () => {
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
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-21T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-22T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-24T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-26T10:00:00.000Z' }
    ],
    now: new Date('2026-03-29T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'VISITAR',
    canal: 'VISITA',
    razon: 'Playbook día 10: visita elegible',
    prioridad: 'ALTA'
  });
});

test('no permite visita en día 10 del playbook cuando la deuda no supera el umbral', () => {
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
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-21T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-22T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-24T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-26T10:00:00.000Z' }
    ],
    now: new Date('2026-03-29T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Visita no permitida: montoDeuda menor o igual al umbral 5000',
    prioridad: 'BAJA'
  });
});

test('detiene cuando todos los canales elegibles están en cooldown operativo', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 61,
      canales: {
        llamada: 68,
        whatsapp: 72,
        sms: 66,
        email: 64,
        visita: 45
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T11:50:00.000Z' },
      { canal: 'SMS', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T11:40:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T11:30:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T11:20:00.000Z' }
    ],
    now: new Date('2026-03-20T12:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Ventana de reintento activa',
    prioridad: 'BAJA'
  });
});

test('detiene cuando la frecuencia es alta y no hay efectividad', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 41,
      canales: {
        llamada: 42,
        whatsapp: 38,
        sms: 36,
        email: 34,
        visita: 33
      }
    },
    contactHistory: [
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-21T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-22T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'NO_CONTACTADO', fecha: '2026-03-24T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-26T10:00:00.000Z' },
      { canal: 'VISITA', resultado: 'NO_CONTACTADO', fecha: '2026-03-29T10:00:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-30T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-30T11:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-30T11:10:00.000Z' },
      { canal: 'LLAMADA', resultado: 'NO_CONTACTADO', fecha: '2026-03-30T11:20:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-30T11:30:00.000Z' }
    ],
    now: new Date('2026-03-30T12:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Detener contacto: intentos totales mayores a 10 en 7 días',
    prioridad: 'BAJA'
  });
});

test('detiene cuando todos los canales tienen score menor a 30', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 24,
      canales: {
        llamada: 28,
        whatsapp: 25,
        sms: 22,
        email: 21,
        visita: 18
      }
    },
    contactHistory: [],
    now: new Date('2026-03-20T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Detener contacto: todos los canales tienen score menor a 30',
    prioridad: 'BAJA'
  });
});

test('detiene cuando dictámenes recientes indican rechazo', () => {
  const result = strategyEngine.resolverSiguienteAccion({
    clienteScore: {
      scoreGeneral: 52,
      canales: {
        llamada: 50,
        whatsapp: 63,
        sms: 58,
        email: 55,
        visita: 45
      }
    },
    contactHistory: [
      {
        canal: 'WHATSAPP',
        resultado: 'NO_CONTACTADO',
        dictamen_tipo_contacto: 'RECHAZO',
        fecha: '2026-03-20T10:00:00.000Z'
      }
    ],
    now: new Date('2026-03-20T12:00:00.000Z')
  });

  assert.deepEqual(result, {
    accion: 'DETENER',
    canal: null,
    razon: 'Detener contacto: dictámenes recientes indican rechazo',
    prioridad: 'BAJA'
  });
});

test('calcularSiguienteAccion consulta ClienteScore y ContactHistory de los ultimos 7 dias', async () => {
  const originalFindOne = ClienteScore.findOne;
  const originalFind = ContactHistory.find;

  ClienteScore.findOne = () => ({
    select() {
      return {
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
      };
    }
  });

  let receivedFilter = null;
  ContactHistory.find = (filter) => {
    receivedFilter = filter;
    return {
      select() {
        return {
          sort() {
            return {
              limit() {
                return {
                  lean: async () => [
                    { canal: 'SMS', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' }
                  ]
                };
              }
            };
          }
        };
      }
    };
  };

  try {
    const clienteId = new mongoose.Types.ObjectId();
    const result = await strategyEngine.calcularSiguienteAccion(clienteId, {
      now: new Date('2026-03-20T10:00:00.000Z')
    });

    assert.equal(String(receivedFilter.clienteId), String(clienteId));
    assert.equal(receivedFilter.fecha.$gte instanceof Date, true);
    assert.deepEqual(result, {
      accion: 'CONTACTAR',
      canal: 'WHATSAPP',
      razon: 'Playbook base día 1',
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
      montoDeuda: 1500,
      estrategia: {
        contactPlan: {
          availabilityByChannel: {
            VISITA: false
          }
        }
      }
    },
    historyAnalysis: strategyEngine.analyzeContactHistory([
      { canal: 'WHATSAPP', resultado: 'CONTACTADO', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'SIN_RESPUESTA', fecha: '2026-03-19T10:00:00.000Z' }
    ])
  });

  assert.equal(validation.allowed, false);
  assert.deepEqual(validation.reasons, [
    'canal VISITA no está disponible',
    'scoreGeneral menor a 40',
    'montoDeuda menor o igual al umbral 5000',
    'menos de 3 canales distintos intentados',
    'menos de 5 intentos totales',
    'los últimos intentos no fueron fallidos'
  ]);
});

test('validateVisitEligibility bloquea una nueva visita cuando ya existe visita reciente', () => {
  const validation = strategyEngine.validateVisitEligibility({
    clienteScore: {
      scoreGeneral: 55,
      montoDeuda: 12000,
      estrategia: {
        contactPlan: {
          availabilityByChannel: {
            VISITA: true
          }
        }
      }
    },
    historyAnalysis: strategyEngine.analyzeContactHistory([
      { canal: 'VISITA', resultado: 'NO_CONTACTADO', fecha: '2026-03-20T08:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-18T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-17T10:00:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'NO_CONTACTADO', fecha: '2026-03-16T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-15T10:00:00.000Z' }
    ]),
    now: new Date('2026-03-20T12:00:00.000Z')
  });

  assert.equal(validation.allowed, false);
  assert.deepEqual(validation.reasons, ['ya existe una visita reciente']);
});

test('validateStopContact acumula razones de baja calidad, sobrecontacto y rechazo reciente', () => {
  const validation = strategyEngine.validateStopContact({
    clienteScore: {
      scoreGeneral: 15,
      canales: {
        llamada: 20,
        whatsapp: 18,
        sms: 17,
        email: 16,
        visita: 14
      }
    },
    historyAnalysis: strategyEngine.analyzeContactHistory([
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-20T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-20T09:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'NO_CONTACTADO', dictamen_tipo_contacto: 'RECHAZO', fecha: '2026-03-20T08:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-19T10:00:00.000Z' },
      { canal: 'LLAMADA', resultado: 'SIN_RESPUESTA', fecha: '2026-03-19T09:00:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-18T10:00:00.000Z' },
      { canal: 'WHATSAPP', resultado: 'SIN_RESPUESTA', fecha: '2026-03-18T09:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-17T10:00:00.000Z' },
      { canal: 'SMS', resultado: 'NO_CONTACTADO', fecha: '2026-03-17T09:00:00.000Z' },
      { canal: 'EMAIL', resultado: 'SIN_RESPUESTA', fecha: '2026-03-16T10:00:00.000Z' },
      { canal: 'VISITA', resultado: 'NO_CONTACTADO', fecha: '2026-03-16T09:00:00.000Z' }
    ])
  });

  assert.equal(validation.shouldStop, true);
  assert.deepEqual(validation.reasons, [
    'todos los canales tienen score menor a 30',
    'intentos totales mayores a 10 en 7 días',
    'dictámenes recientes indican rechazo'
  ]);
});
