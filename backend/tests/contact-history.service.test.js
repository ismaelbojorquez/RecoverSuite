import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const [{ registrarIntento }, { default: ContactHistory }] = await Promise.all([
  import('../src/services/contactHistory.service.js'),
  import('../src/models/ContactHistory.js')
]);

test('registrarIntento crea historial valido para canal EMAIL', async () => {
  const originalSave = ContactHistory.prototype.save;
  ContactHistory.prototype.save = async function saveMock() {
    return this;
  };

  try {
    const clienteId = new mongoose.Types.ObjectId();
    const dictamenId = new mongoose.Types.ObjectId();
    const agenteId = new mongoose.Types.ObjectId();

    const intento = await registrarIntento(
      clienteId,
      'email',
      'sin_respuesta',
      dictamenId,
      { agenteId }
    );

    assert.equal(String(intento.clienteId), String(clienteId));
    assert.equal(intento.canal, 'EMAIL');
    assert.equal(intento.resultado, 'SIN_RESPUESTA');
    assert.equal(String(intento.dictamenId), String(dictamenId));
    assert.equal(String(intento.agenteId), String(agenteId));
  } finally {
    ContactHistory.prototype.save = originalSave;
  }
});

test('registrarIntento rechaza canales invalidos', async () => {
  const clienteId = new mongoose.Types.ObjectId();

  await assert.rejects(
    registrarIntento(clienteId, 'CHATBOT', 'CONTACTADO', null),
    /canal es invalido/i
  );
});
