import { connectMongo } from '../config/mongo.js';
import ClienteScore from '../models/ClienteScore.js';
import { resolveDecisionClientId } from './decisionIdentity.service.js';

const toFiniteNumberOrUndefined = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildChannelSnapshot = (snapshot = {}) => ({
  llamada: toFiniteNumberOrUndefined(snapshot.score_llamada),
  whatsapp: toFiniteNumberOrUndefined(snapshot.score_whatsapp),
  sms: toFiniteNumberOrUndefined(snapshot.score_sms),
  email: toFiniteNumberOrUndefined(snapshot.score_email),
  visita: toFiniteNumberOrUndefined(snapshot.score_visita)
});

const buildStrategySnapshot = (snapshot = {}, decision = null) => ({
  nextBestAction:
    decision?.accion ??
    snapshot.strategy_next_best_action ??
    undefined,
  recommendedChannel:
    decision?.canal ??
    snapshot.strategy_recommended_channel ??
    undefined,
  shouldStopContact:
    decision?.accion === 'DETENER'
      ? true
      : Boolean(snapshot.strategy_should_stop_contact),
  shouldEscalateVisit:
    decision?.accion === 'VISITAR' && decision?.canal === 'VISITA'
      ? true
      : Boolean(snapshot.strategy_should_escalate_visit),
  visitEligible:
    snapshot.strategy_visit_eligible === undefined || snapshot.strategy_visit_eligible === null
      ? undefined
      : Boolean(snapshot.strategy_visit_eligible),
  sequenceStep: toFiniteNumberOrUndefined(snapshot.strategy_sequence_step),
  reasonCodes:
    decision?.razon
      ? [decision.razon]
      : Array.isArray(snapshot.strategy_reason_codes)
        ? snapshot.strategy_reason_codes
        : [],
  contactPlan: snapshot.strategy_contact_plan ?? undefined
});

export const syncClienteScoreSnapshot = async (
  clientExternalId,
  scoringSnapshot,
  { montoDeuda } = {}
) => {
  await connectMongo();

  const clienteId = resolveDecisionClientId(clientExternalId);
  const update = {
    scoreGeneral: toFiniteNumberOrUndefined(scoringSnapshot?.score_global),
    canales: buildChannelSnapshot(scoringSnapshot),
    riesgo: scoringSnapshot?.scoring_riesgo_nivel ?? undefined,
    estrategia: buildStrategySnapshot(scoringSnapshot),
    ultimaActualizacion:
      scoringSnapshot?.scoring_actualizado_at
        ? new Date(scoringSnapshot.scoring_actualizado_at)
        : new Date()
  };

  if (montoDeuda !== undefined && montoDeuda !== null) {
    update.montoDeuda = toFiniteNumberOrUndefined(montoDeuda);
  }

  return ClienteScore.findOneAndUpdate(
    { clienteId },
    {
      $set: update,
      $setOnInsert: { clienteId }
    },
    {
      new: true,
      upsert: true
    }
  );
};

export const applyStrategyDecisionToClienteScore = async (clientExternalId, decision, snapshot = {}) => {
  await connectMongo();

  const clienteId = resolveDecisionClientId(clientExternalId);
  const strategyUpdate = buildStrategySnapshot(snapshot, decision);

  return ClienteScore.findOneAndUpdate(
    { clienteId },
    {
      $set: {
        estrategia: strategyUpdate,
        ultimaActualizacion: new Date()
      },
      $setOnInsert: {
        clienteId,
        scoreGeneral: toFiniteNumberOrUndefined(snapshot?.score_global),
        canales: buildChannelSnapshot(snapshot),
        riesgo: snapshot?.scoring_riesgo_nivel ?? undefined
      }
    },
    {
      new: true,
      upsert: true
    }
  );
};

export default {
  syncClienteScoreSnapshot,
  applyStrategyDecisionToClienteScore
};
