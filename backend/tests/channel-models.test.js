import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const [{ default: Dictamen }, { default: ClienteScore }, { default: Gestion }, { default: Queue }] =
  await Promise.all([
    import('../src/models/Dictamen.js'),
    import('../src/models/ClienteScore.js'),
    import('../src/models/Gestion.js'),
    import('../src/models/Queue.js')
  ]);

test('los modelos del motor de decisiones soportan EMAIL y mantienen enums consistentes', async () => {
  assert.equal(Dictamen.schema.path('tipoContacto').enumValues.includes('CONTACTADO'), true);
  assert.equal(Gestion.schema.path('medioContacto').enumValues.includes('EMAIL'), true);
  assert.equal(Queue.schema.path('canalActual').enumValues.includes('EMAIL'), true);
  assert.equal(
    Queue.schema.path('canalesHabilitados').caster.enumValues.includes('EMAIL'),
    true
  );

  const objectId = new mongoose.Types.ObjectId();

  const dictamen = new Dictamen({
    nombre: 'Contacto por email verificado',
    tipoContacto: 'CONTACTADO',
    riesgo: 'BAJO',
    score: 82,
    canales: {
      email: 90
    },
    permiteContacto: true,
    recomendarReintento: false,
    bloquearCliente: false
  });

  const clienteScore = new ClienteScore({
    clienteId: objectId,
    canales: {
      llamada: 60,
      whatsapp: 55,
      sms: 50,
      email: 88,
      visita: 40
    },
    riesgo: 'MEDIO',
    estrategia: {
      recommendedChannel: 'EMAIL',
      nextBestAction: 'CONTACTAR_EMAIL'
    }
  });

  const gestion = new Gestion({
    clienteId: objectId,
    usuarioId: objectId,
    medioContacto: 'EMAIL',
    dictamenId: objectId,
    comentarios: 'Se envio correo y se obtuvo respuesta.'
  });

  const queue = new Queue({
    clienteId: objectId,
    accion: 'CONTACTAR',
    canal: 'EMAIL',
    canalActual: 'EMAIL',
    siguienteCanal: 'VISITA',
    canalesHabilitados: ['SMS', 'EMAIL', 'VISITA'],
    prioridadEtiqueta: 'ALTA',
    razon: 'Canal no explorado',
    estrategia: {
      recommendedChannel: 'EMAIL',
      nextBestAction: 'CONTACTAR_EMAIL'
    }
  });

  await Promise.all([
    dictamen.validate(),
    clienteScore.validate(),
    gestion.validate(),
    queue.validate()
  ]);

  assert.deepEqual(queue.canalesHabilitados, ['SMS', 'EMAIL', 'VISITA']);
  assert.equal(queue.canal, 'EMAIL');
  assert.equal(queue.prioridadEtiqueta, 'ALTA');
  assert.equal(clienteScore.scoreGeneral, 58.6);
});
