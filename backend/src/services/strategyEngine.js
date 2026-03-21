import mongoose from 'mongoose';
import { connectMongo } from '../config/mongo.js';
import ClienteScore from '../models/ClienteScore.js';
import ContactHistory from '../models/ContactHistory.js';
import { DECISION_CONTACT_CHANNELS } from '../models/decisionEngine.shared.js';

const DIGITAL_CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL'];
const CALL_CHANNEL = 'LLAMADA';
const VISIT_CHANNEL = 'VISITA';
const CHANNEL_PRIORITY_ORDER = ['WHATSAPP', 'SMS', 'EMAIL', 'LLAMADA', 'VISITA'];
const FAILURE_RESULTS = new Set(['NO_CONTACTADO', 'RECHAZO', 'SIN_RESPUESTA']);
const FALLBACK_PRIORITY = 'MEDIA';
const FAILED_ATTEMPTS_PENALTY_THRESHOLD = 3;
const CALL_TO_VISIT_FAILURE_THRESHOLD = 2;
const OVERCONTACT_THRESHOLD = 7;
const VISIT_MIN_SCORE_THRESHOLD = 40;
const VISIT_MIN_ATTEMPTS_THRESHOLD = 5;
const VISIT_MIN_DISTINCT_CHANNELS = 3;
const VISIT_RECENT_FAILURE_WINDOW = 3;
const DEFAULT_VISIT_DEBT_THRESHOLD = 5000;
const HIGH_SCORE_THRESHOLD = 70;
const MEDIUM_SCORE_THRESHOLD = 40;

const CHANNEL_SCORE_KEY_MAP = Object.freeze({
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VISITA: 'visita'
});

const normalizeText = (value) => String(value || '').trim().toUpperCase();

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toObjectIdOrThrow = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new Error(`${label} es invalido.`);
  }

  return new mongoose.Types.ObjectId(value);
};

const getChannelScore = (clienteScore, channel) => {
  const channelKey = CHANNEL_SCORE_KEY_MAP[channel];
  const channelScore = clienteScore?.canales?.[channelKey];
  if (Number.isFinite(channelScore)) {
    return channelScore;
  }

  return Number.isFinite(clienteScore?.scoreGeneral) ? clienteScore.scoreGeneral : 0;
};

const compareCandidates = (left, right) => {
  if (right.adjustedScore !== left.adjustedScore) {
    return right.adjustedScore - left.adjustedScore;
  }

  if (left.stats.attempts !== right.stats.attempts) {
    return left.stats.attempts - right.stats.attempts;
  }

  return CHANNEL_PRIORITY_ORDER.indexOf(left.channel) - CHANNEL_PRIORITY_ORDER.indexOf(right.channel);
};

const buildEmptyChannelStats = () => ({
  attempts: 0,
  failAttempts: 0,
  successAttempts: 0,
  lastAttemptAt: null
});

const sortHistoryByRecency = (rows = []) =>
  [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    const leftTime = new Date(left?.fecha || 0).getTime();
    const rightTime = new Date(right?.fecha || 0).getTime();
    return rightTime - leftTime;
  });

export const analyzeContactHistory = (historyRows = []) => {
  const orderedRows = sortHistoryByRecency(historyRows);
  const stats = DECISION_CONTACT_CHANNELS.reduce((accumulator, channel) => {
    accumulator[channel] = buildEmptyChannelStats();
    return accumulator;
  }, {});

  let totalAttempts = 0;
  let totalFailures = 0;
  let totalSuccesses = 0;

  for (const row of orderedRows) {
    const channel = normalizeText(row?.canal);
    if (!stats[channel]) {
      continue;
    }

    const result = normalizeText(row?.resultado);
    const channelStats = stats[channel];

    channelStats.attempts += 1;
    totalAttempts += 1;

    if (!channelStats.lastAttemptAt && row?.fecha) {
      const date = new Date(row.fecha);
      channelStats.lastAttemptAt = Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    if (result === 'CONTACTADO') {
      channelStats.successAttempts += 1;
      totalSuccesses += 1;
      continue;
    }

    if (FAILURE_RESULTS.has(result)) {
      channelStats.failAttempts += 1;
      totalFailures += 1;
    }
  }

  return {
    orderedRows,
    stats,
    totalAttempts,
    totalFailures,
    totalSuccesses
  };
};

const resolveDebtAmount = (clienteScore = {}) =>
  toFiniteNumber(
    clienteScore?.montoDeuda ??
      clienteScore?.monto_deuda ??
      clienteScore?.metadata?.montoDeuda ??
      clienteScore?.metadata?.monto_deuda,
    0
  );

export const validateVisitEligibility = ({
  clienteScore = null,
  historyAnalysis = null,
  debtThreshold = DEFAULT_VISIT_DEBT_THRESHOLD
} = {}) => {
  const safeHistory = historyAnalysis || analyzeContactHistory([]);
  const scoreGeneral = toFiniteNumber(clienteScore?.scoreGeneral ?? clienteScore?.score_general, 0);
  const montoDeuda = resolveDebtAmount(clienteScore);
  const distinctChannelsTried = DECISION_CONTACT_CHANNELS.filter(
    (channel) => safeHistory.stats?.[channel]?.attempts > 0
  ).length;
  const recentAttempts = (safeHistory.orderedRows || []).slice(0, VISIT_RECENT_FAILURE_WINDOW);
  const recentAttemptsFailed =
    recentAttempts.length === VISIT_RECENT_FAILURE_WINDOW &&
    recentAttempts.every((row) => FAILURE_RESULTS.has(normalizeText(row?.resultado)));

  const reasons = [];

  if (scoreGeneral < VISIT_MIN_SCORE_THRESHOLD) {
    reasons.push(`scoreGeneral menor a ${VISIT_MIN_SCORE_THRESHOLD}`);
  }

  if (montoDeuda <= debtThreshold) {
    reasons.push(`montoDeuda menor o igual al umbral ${debtThreshold}`);
  }

  if (distinctChannelsTried < VISIT_MIN_DISTINCT_CHANNELS) {
    reasons.push(`menos de ${VISIT_MIN_DISTINCT_CHANNELS} canales distintos intentados`);
  }

  if ((safeHistory.totalAttempts || 0) < VISIT_MIN_ATTEMPTS_THRESHOLD) {
    reasons.push(`menos de ${VISIT_MIN_ATTEMPTS_THRESHOLD} intentos totales`);
  }

  if (!recentAttemptsFailed) {
    reasons.push('los últimos intentos no fueron fallidos');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    scoreGeneral,
    montoDeuda,
    debtThreshold,
    distinctChannelsTried,
    totalAttempts: safeHistory.totalAttempts || 0,
    recentAttemptsFailed
  };
};

const buildCandidate = ({ channel, clienteScore, stats, exploreBonus = 0, forceReason = null }) => {
  const baseScore = getChannelScore(clienteScore, channel);
  const failurePenalty =
    stats.failAttempts >= FAILED_ATTEMPTS_PENALTY_THRESHOLD
      ? 45 + (stats.failAttempts - FAILED_ATTEMPTS_PENALTY_THRESHOLD) * 10
      : stats.failAttempts * 12;
  const frequencyPenalty = stats.attempts * 6;
  const successBonus = stats.successAttempts > 0 ? 8 : 0;
  const adjustedScore = baseScore + exploreBonus + successBonus - failurePenalty - frequencyPenalty;

  return {
    channel,
    baseScore,
    adjustedScore,
    reason: forceReason,
    stats
  };
};

const resolvePriority = ({ action, score, adjustedScore, exploratory = false, overloaded = false }) => {
  if (action === 'DETENER') {
    return 'BAJA';
  }

  if (action === 'VISITAR') {
    return 'ALTA';
  }

  if (exploratory && score >= MEDIUM_SCORE_THRESHOLD) {
    return 'ALTA';
  }

  if (overloaded) {
    return 'MEDIA';
  }

  if (score >= HIGH_SCORE_THRESHOLD || adjustedScore >= HIGH_SCORE_THRESHOLD) {
    return 'ALTA';
  }

  if (score >= MEDIUM_SCORE_THRESHOLD || adjustedScore >= MEDIUM_SCORE_THRESHOLD) {
    return 'MEDIA';
  }

  return FALLBACK_PRIORITY;
};

export const resolverSiguienteAccion = ({
  clienteScore = null,
  contactHistory = [],
  debtThreshold = DEFAULT_VISIT_DEBT_THRESHOLD
} = {}) => {
  const historyAnalysis = analyzeContactHistory(contactHistory);
  const { stats, totalAttempts, totalSuccesses } = historyAnalysis;
  const visitValidation = validateVisitEligibility({
    clienteScore,
    historyAnalysis,
    debtThreshold
  });

  if (clienteScore?.estrategia?.shouldStopContact === true) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Estrategia actual indica detener contacto',
      prioridad: 'BAJA'
    };
  }

  const unexploredDigitalCandidates = DIGITAL_CHANNELS.map((channel) =>
    buildCandidate({
      channel,
      clienteScore,
      stats: stats[channel],
      exploreBonus: 20,
      forceReason: 'Canal no explorado'
    })
  )
    .filter((candidate) => candidate.stats.attempts === 0)
    .sort(compareCandidates);

  if (unexploredDigitalCandidates.length > 0) {
    const candidate = unexploredDigitalCandidates[0];
    return {
      accion: 'CONTACTAR',
      canal: candidate.channel,
      razon: candidate.reason,
      prioridad: resolvePriority({
        action: 'CONTACTAR',
        score: candidate.baseScore,
        adjustedScore: candidate.adjustedScore,
        exploratory: true,
        overloaded: totalAttempts >= OVERCONTACT_THRESHOLD
      })
    };
  }

  const allDigitalFailed = DIGITAL_CHANNELS.every((channel) => {
    const channelStats = stats[channel];
    return channelStats.attempts > 0 && channelStats.successAttempts === 0;
  });
  const visitAlreadyTried = stats[VISIT_CHANNEL].attempts > 0;
  const overcontactedWithoutSuccess = totalAttempts >= OVERCONTACT_THRESHOLD && totalSuccesses === 0;

  if (
    overcontactedWithoutSuccess &&
    allDigitalFailed &&
    stats[CALL_CHANNEL].failAttempts >= CALL_TO_VISIT_FAILURE_THRESHOLD &&
    visitAlreadyTried
  ) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Frecuencia alta sin respuesta efectiva',
      prioridad: 'BAJA'
    };
  }

  if (allDigitalFailed && stats[CALL_CHANNEL].failAttempts >= CALL_TO_VISIT_FAILURE_THRESHOLD) {
    if (!visitValidation.allowed) {
      return {
        accion: 'DETENER',
        canal: null,
        razon: `Visita no permitida: ${visitValidation.reasons.join('; ')}`,
        prioridad: 'BAJA'
      };
    }

    return {
      accion: 'VISITAR',
      canal: VISIT_CHANNEL,
      razon: 'Visita elegible por score, deuda e intentos fallidos',
      prioridad: 'ALTA'
    };
  }

  if (allDigitalFailed) {
    return {
      accion: 'CONTACTAR',
      canal: CALL_CHANNEL,
      razon: 'Canales digitales agotados',
      prioridad: 'ALTA'
    };
  }

  const rankedContactCandidates = [...DIGITAL_CHANNELS, CALL_CHANNEL]
    .map((channel) =>
      buildCandidate({
        channel,
        clienteScore,
        stats: stats[channel]
      })
    )
    .filter((candidate) => candidate.adjustedScore > 0)
    .sort(compareCandidates);

  const bestCandidate = rankedContactCandidates[0] || null;
  if (bestCandidate) {
    const penalized = bestCandidate.stats.failAttempts >= FAILED_ATTEMPTS_PENALTY_THRESHOLD;
    return {
      accion: 'CONTACTAR',
      canal: bestCandidate.channel,
      razon: penalized ? 'Canal con mejor score ajustado' : 'Canal con score alto',
      prioridad: resolvePriority({
        action: 'CONTACTAR',
        score: bestCandidate.baseScore,
        adjustedScore: bestCandidate.adjustedScore,
        exploratory: false,
        overloaded: totalAttempts >= OVERCONTACT_THRESHOLD
      })
    };
  }

  if (stats[CALL_CHANNEL].failAttempts >= CALL_TO_VISIT_FAILURE_THRESHOLD) {
    if (!visitValidation.allowed) {
      return {
        accion: 'DETENER',
        canal: null,
        razon: `Visita no permitida: ${visitValidation.reasons.join('; ')}`,
        prioridad: 'BAJA'
      };
    }

    return {
      accion: 'VISITAR',
      canal: VISIT_CHANNEL,
      razon: 'Visita elegible por score, deuda e intentos fallidos',
      prioridad: 'ALTA'
    };
  }

  if (overcontactedWithoutSuccess) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Frecuencia alta sin respuesta efectiva',
      prioridad: 'BAJA'
    };
  }

  return {
    accion: 'DETENER',
    canal: null,
    razon: 'No hay canales viables',
    prioridad: 'BAJA'
  };
};

export const calcularSiguienteAccion = async (clienteId, options = {}) => {
  const clientObjectId = toObjectIdOrThrow(clienteId, 'clienteId');
  await connectMongo();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [clienteScore, contactHistory] = await Promise.all([
    ClienteScore.findOne({ clienteId: clientObjectId }).lean(),
    ContactHistory.find({
      clienteId: clientObjectId,
      fecha: { $gte: sevenDaysAgo }
    })
      .sort({ fecha: -1, _id: -1 })
      .lean()
  ]);

  return resolverSiguienteAccion({
    clienteScore,
    contactHistory,
    debtThreshold: options.debtThreshold ?? DEFAULT_VISIT_DEBT_THRESHOLD
  });
};

export default {
  calcularSiguienteAccion,
  resolverSiguienteAccion,
  analyzeContactHistory,
  validateVisitEligibility
};
