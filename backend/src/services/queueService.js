import { connectMongo } from '../config/mongo.js';
import Queue from '../models/Queue.js';
import { calcularSiguienteAccion } from './strategyEngine.js';
import {
  resolveDecisionClientId,
  resolveDecisionCreditId,
  resolveDecisionPortfolioId
} from './decisionIdentity.service.js';

const PRIORITY_SCORE_BY_LABEL = Object.freeze({
  BAJA: 25,
  MEDIA: 50,
  ALTA: 90
});

const ACTIVE_QUEUE_STATES = ['PENDIENTE', 'EN_PROCESO', 'PAUSADO'];

const normalizePriorityLabel = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return PRIORITY_SCORE_BY_LABEL[normalized] ? normalized : 'MEDIA';
};

export const mapPriorityLabelToValue = (value) =>
  PRIORITY_SCORE_BY_LABEL[normalizePriorityLabel(value)] ?? PRIORITY_SCORE_BY_LABEL.MEDIA;

export const construirPayloadQueue = ({
  clienteId,
  decision,
  portafolioId,
  creditoId,
  metadata
}) => {
  const prioridadEtiqueta =
    decision?.accion === 'VISITAR' ? 'ALTA' : normalizePriorityLabel(decision?.prioridad);

  return {
    clienteId: resolveDecisionClientId(clienteId),
    creditoId: resolveDecisionCreditId(creditoId, { required: false }),
    portafolioId: resolveDecisionPortfolioId(portafolioId, { required: false }),
    estado: 'PENDIENTE',
    accion: decision?.accion || 'CONTACTAR',
    canal: decision?.canal || undefined,
    canalActual: decision?.canal || undefined,
    siguienteCanal: decision?.canal || undefined,
    prioridadEtiqueta,
    prioridad: mapPriorityLabelToValue(prioridadEtiqueta),
    razon: decision?.razon || undefined,
    estrategia: {
      nextBestAction: decision?.accion || undefined,
      recommendedChannel: decision?.canal || undefined,
      reasonCodes: decision?.razon ? [decision.razon] : []
    },
    metadata: {
      source: 'strategyEngine',
      ...(metadata && typeof metadata === 'object' ? metadata : {})
    }
  };
};

export const actualizarColaConDecision = async (
  clienteId,
  decision,
  {
    portafolioId,
    creditoId,
    metadata,
    QueueModel = Queue
  } = {}
) => {
  if (QueueModel === Queue) {
    await connectMongo();
  }

  const resolvedClientId = resolveDecisionClientId(clienteId);

  if (!decision || decision.accion === 'DETENER') {
    if (typeof QueueModel.updateMany === 'function') {
      await QueueModel.updateMany(
        {
          clienteId: resolvedClientId,
          estado: { $in: ACTIVE_QUEUE_STATES }
        },
        {
          $set: {
            estado: 'DETENIDO',
            accion: 'DETENER',
            prioridadEtiqueta: 'BAJA',
            prioridad: mapPriorityLabelToValue('BAJA'),
            razon: decision?.razon || 'Detener contacto'
          },
          $unset: {
            canal: 1,
            canalActual: 1,
            siguienteCanal: 1
          }
        }
      );
    }

    return {
      queued: false,
      decision,
      queueItem: null
    };
  }

  const payload = construirPayloadQueue({
    clienteId,
    decision,
    portafolioId,
    creditoId,
    metadata
  });

  if (typeof QueueModel.findOneAndUpdate === 'function') {
    const queueItem = await QueueModel.findOneAndUpdate(
      {
        clienteId: resolvedClientId,
        estado: { $in: ACTIVE_QUEUE_STATES }
      },
      {
        $set: payload,
        $setOnInsert: {
          clienteId: resolvedClientId
        }
      },
      {
        new: true,
        upsert: true,
        sort: { updatedAt: -1 }
      }
    );

    return {
      queued: true,
      decision,
      queueItem
    };
  }

  const queueItem = new QueueModel(payload);
  await queueItem.validate();
  await queueItem.save();

  return {
    queued: true,
    decision,
    queueItem
  };
};

export const encolarSegunEstrategia = async (
  clienteId,
  {
    portafolioId,
    creditoId,
    metadata,
    strategyOptions,
    strategyResolver = calcularSiguienteAccion,
    QueueModel = Queue
  } = {}
) => {
  const decision = await strategyResolver(clienteId, strategyOptions || {});
  return actualizarColaConDecision(clienteId, decision, {
    portafolioId,
    creditoId,
    metadata,
    QueueModel
  });
};

export default {
  actualizarColaConDecision,
  encolarSegunEstrategia,
  construirPayloadQueue,
  mapPriorityLabelToValue
};
