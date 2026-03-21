import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const queueService = await import('../src/services/queueService.js');

class FakeQueueModel {
  constructor(payload) {
    Object.assign(this, payload);
  }

  async validate() {
    return undefined;
  }

  async save() {
    this.saved = true;
    return this;
  }
}

test('encolarSegunEstrategia agrega a cola cuando la acción es CONTACTAR', async () => {
  const clienteId = new mongoose.Types.ObjectId();

  const result = await queueService.encolarSegunEstrategia(clienteId, {
    strategyResolver: async () => ({
      accion: 'CONTACTAR',
      canal: 'WHATSAPP',
      razon: 'Canal no explorado',
      prioridad: 'ALTA'
    }),
    QueueModel: FakeQueueModel
  });

  assert.equal(result.queued, true);
  assert.equal(result.queueItem.canal, 'WHATSAPP');
  assert.equal(result.queueItem.prioridadEtiqueta, 'ALTA');
  assert.equal(result.queueItem.prioridad, 90);
  assert.equal(result.queueItem.razon, 'Canal no explorado');
  assert.equal(result.queueItem.saved, true);
});

test('encolarSegunEstrategia fuerza prioridad alta cuando la acción es VISITAR', async () => {
  const clienteId = new mongoose.Types.ObjectId();

  const result = await queueService.encolarSegunEstrategia(clienteId, {
    strategyResolver: async () => ({
      accion: 'VISITAR',
      canal: 'VISITA',
      razon: 'Playbook día 10: visita elegible',
      prioridad: 'MEDIA'
    }),
    QueueModel: FakeQueueModel
  });

  assert.equal(result.queued, true);
  assert.equal(result.queueItem.accion, 'VISITAR');
  assert.equal(result.queueItem.canal, 'VISITA');
  assert.equal(result.queueItem.prioridadEtiqueta, 'ALTA');
  assert.equal(result.queueItem.prioridad, 90);
});

test('encolarSegunEstrategia no agrega a cola cuando la acción es DETENER', async () => {
  const clienteId = new mongoose.Types.ObjectId();

  const result = await queueService.encolarSegunEstrategia(clienteId, {
    strategyResolver: async () => ({
      accion: 'DETENER',
      canal: null,
      razon: 'Detener contacto: dictámenes recientes indican rechazo',
      prioridad: 'BAJA'
    }),
    QueueModel: FakeQueueModel
  });

  assert.deepEqual(result, {
    queued: false,
    decision: {
      accion: 'DETENER',
      canal: null,
      razon: 'Detener contacto: dictámenes recientes indican rechazo',
      prioridad: 'BAJA'
    },
    queueItem: null
  });
});

test('construirPayloadQueue persiste canal prioridad y razón', () => {
  const clienteId = new mongoose.Types.ObjectId();

  const payload = queueService.construirPayloadQueue({
    clienteId,
    decision: {
      accion: 'CONTACTAR',
      canal: 'EMAIL',
      razon: 'Playbook base día 5',
      prioridad: 'MEDIA'
    }
  });

  assert.equal(String(payload.clienteId), String(clienteId));
  assert.equal(payload.canal, 'EMAIL');
  assert.equal(payload.siguienteCanal, 'EMAIL');
  assert.equal(payload.prioridadEtiqueta, 'MEDIA');
  assert.equal(payload.prioridad, 50);
  assert.equal(payload.razon, 'Playbook base día 5');
});
