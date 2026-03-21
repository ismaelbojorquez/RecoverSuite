import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const playbookService = await import('../src/services/playbookService.js');
const { default: ContactHistory } = await import('../src/models/ContactHistory.js');

test('resolverSiguientePasoPlaybook devuelve WhatsApp en día 1 sin historial', () => {
  const result = playbookService.resolverSiguientePasoPlaybook({
    contactHistory: [],
    now: new Date('2026-03-20T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    paso: 1,
    dia: 1,
    accion: 'CONTACTAR',
    canal: 'WHATSAPP',
    descripcion: 'Día 1: WhatsApp',
    razon: 'Playbook base día 1',
    due: true,
    diasTranscurridos: 1
  });
});

test('resolverSiguientePasoPlaybook avanza a SMS después del paso de WhatsApp', () => {
  const result = playbookService.resolverSiguientePasoPlaybook({
    contactHistory: [
      { canal: 'WHATSAPP', fecha: '2026-03-20T09:00:00.000Z' }
    ],
    now: new Date('2026-03-21T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    paso: 2,
    dia: 2,
    accion: 'CONTACTAR',
    canal: 'SMS',
    descripcion: 'Día 2: SMS',
    razon: 'Playbook base día 2',
    due: true,
    diasTranscurridos: 2
  });
});

test('resolverSiguientePasoPlaybook llega a evaluar visita en día 10', () => {
  const result = playbookService.resolverSiguientePasoPlaybook({
    contactHistory: [
      { canal: 'WHATSAPP', fecha: '2026-03-20T09:00:00.000Z' },
      { canal: 'SMS', fecha: '2026-03-21T09:00:00.000Z' },
      { canal: 'LLAMADA', fecha: '2026-03-22T09:00:00.000Z' },
      { canal: 'EMAIL', fecha: '2026-03-24T09:00:00.000Z' },
      { canal: 'LLAMADA', fecha: '2026-03-26T09:00:00.000Z' }
    ],
    now: new Date('2026-03-29T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    paso: 6,
    dia: 10,
    accion: 'EVALUAR_VISITA',
    canal: 'VISITA',
    descripcion: 'Día 10: Evaluar visita',
    razon: 'Playbook base día 10',
    due: true,
    diasTranscurridos: 10
  });
});

test('resolverSiguientePasoPlaybook reinicia secuencia cuando el historial quedó fuera de la ventana activa', () => {
  const result = playbookService.resolverSiguientePasoPlaybook({
    contactHistory: [
      { canal: 'WHATSAPP', fecha: '2026-02-20T09:00:00.000Z' },
      { canal: 'SMS', fecha: '2026-02-21T09:00:00.000Z' }
    ],
    now: new Date('2026-03-20T10:00:00.000Z')
  });

  assert.deepEqual(result, {
    paso: 1,
    dia: 1,
    accion: 'CONTACTAR',
    canal: 'WHATSAPP',
    descripcion: 'Día 1: WhatsApp',
    razon: 'Playbook base día 1',
    due: true,
    diasTranscurridos: 1
  });
});

test('obtenerSiguientePaso consulta historial por cliente y resuelve el paso pendiente', async () => {
  const originalFind = ContactHistory.find;

  ContactHistory.find = () => ({
    select() {
      return {
        sort() {
          return {
            limit() {
              return {
                lean: async () => [
                  { canal: 'WHATSAPP', fecha: '2026-03-20T09:00:00.000Z' }
                ]
              };
            }
          };
        }
      };
    }
  });

  try {
    const clienteId = new mongoose.Types.ObjectId();
    const result = await playbookService.obtenerSiguientePaso(clienteId, {
      now: new Date('2026-03-21T10:00:00.000Z')
    });

    assert.equal(result.paso, 2);
    assert.equal(result.canal, 'SMS');
    assert.equal(result.accion, 'CONTACTAR');
  } finally {
    ContactHistory.find = originalFind;
  }
});
