import mongoose from 'mongoose';
import { connectMongo } from '../config/mongo.js';
import ClienteScore from '../models/ClienteScore.js';
import ContactHistory from '../models/ContactHistory.js';
import { DECISION_CONTACT_CHANNELS } from '../models/decisionEngine.shared.js';
import { resolverSiguientePasoPlaybook } from './playbookService.js';

const DIGITAL_CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL'];
const CALL_CHANNEL = 'LLAMADA';
const VISIT_CHANNEL = 'VISITA';
const CHANNEL_PRIORITY_ORDER = ['WHATSAPP', 'SMS', 'EMAIL', 'LLAMADA', 'VISITA'];
const DEFAULT_HISTORY_WINDOW_DAYS = 7;
const HISTORY_QUERY_LIMIT = 128;
const FAILURE_RESULTS = new Set(['NO_CONTACTADO', 'RECHAZO', 'SIN_RESPUESTA']);
const FALLBACK_PRIORITY = 'MEDIA';
const FAILED_ATTEMPTS_PENALTY_THRESHOLD = 3;
const CALL_TO_VISIT_FAILURE_THRESHOLD = 2;
const OVERCONTACT_THRESHOLD = 7;
const STOP_LOW_SCORE_THRESHOLD = 30;
const STOP_ATTEMPTS_THRESHOLD = 10;
const STOP_RECENT_REJECTION_WINDOW = 3;
const VISIT_MIN_SCORE_THRESHOLD = 40;
const VISIT_MIN_ATTEMPTS_THRESHOLD = 5;
const VISIT_MIN_DISTINCT_CHANNELS = 3;
const VISIT_RECENT_FAILURE_WINDOW = 3;
const VISIT_REPEAT_COOLDOWN_HOURS = 24 * 7;
const DEFAULT_VISIT_DEBT_THRESHOLD = 5000;
const HIGH_SCORE_THRESHOLD = 70;
const MEDIUM_SCORE_THRESHOLD = 40;
const CHANNEL_COOLDOWN_HOURS = Object.freeze({
  WHATSAPP: 24,
  SMS: 24,
  EMAIL: 24,
  LLAMADA: 12,
  VISITA: VISIT_REPEAT_COOLDOWN_HOURS
});
const CHANNEL_ATTEMPT_LIMITS = Object.freeze({
  WHATSAPP: 3,
  SMS: 3,
  EMAIL: 3,
  LLAMADA: 4,
  VISITA: 1
});

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

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

const resolveChannelAvailabilityMap = (clienteScore = {}) => {
  const nestedAvailability =
    clienteScore?.estrategia?.contactPlan?.availabilityByChannel ??
    clienteScore?.estrategia?.contactPlan?.availability_by_channel ??
    clienteScore?.estrategia?.contact_plan?.availabilityByChannel ??
    clienteScore?.estrategia?.contact_plan?.availability_by_channel ??
    clienteScore?.metadata?.availabilityByChannel ??
    clienteScore?.metadata?.availability_by_channel;

  return nestedAvailability && typeof nestedAvailability === 'object' ? nestedAvailability : null;
};

const isChannelAvailable = (clienteScore, channel) => {
  const availabilityMap = resolveChannelAvailabilityMap(clienteScore);
  if (!availabilityMap) {
    return true;
  }

  const directValue =
    availabilityMap[channel] ??
    availabilityMap[String(channel || '').toLowerCase()];

  if (directValue === undefined || directValue === null) {
    return true;
  }

  return Boolean(directValue);
};

const hoursSince = (value, now) => {
  const date = toDateOrNull(value);
  const referenceDate = toDateOrNull(now);

  if (!date || !referenceDate) {
    return Number.POSITIVE_INFINITY;
  }

  return (referenceDate.getTime() - date.getTime()) / 3600000;
};

const buildDateDaysAgo = (value, days) => {
  const baseDate = toDateOrNull(value) || new Date();
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
};

const resolveChannelOperationalState = ({ channel, clienteScore = null, stats = {}, now = new Date() }) => {
  const channelStats = stats?.[channel] || buildEmptyChannelStats();
  const available = isChannelAvailable(clienteScore, channel);
  const cooldownHours = CHANNEL_COOLDOWN_HOURS[channel] ?? 0;
  const attemptLimit = CHANNEL_ATTEMPT_LIMITS[channel] ?? Number.POSITIVE_INFINITY;
  const elapsedHours = hoursSince(channelStats.lastAttemptAt, now);
  const inCooldown =
    Number.isFinite(cooldownHours) &&
    cooldownHours > 0 &&
    Number.isFinite(elapsedHours) &&
    elapsedHours < cooldownHours;
  const reachedAttemptLimit = (channelStats.attempts || 0) >= attemptLimit;

  return {
    available,
    inCooldown,
    reachedAttemptLimit,
    eligible: available && !inCooldown && !reachedAttemptLimit
  };
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

const extractRecentRejectionSignal = (row) => {
  const candidates = [
    row?.resultado,
    row?.tipoContacto,
    row?.tipo_contacto,
    row?.dictamenTipoContacto,
    row?.dictamen_tipo_contacto,
    row?.dictamen?.tipoContacto,
    row?.dictamen?.tipo_contacto
  ];

  return candidates.some((value) => normalizeText(value) === 'RECHAZO');
};

export const validateStopContact = ({
  clienteScore = null,
  historyAnalysis = null
} = {}) => {
  const safeHistory = historyAnalysis || analyzeContactHistory([]);
  const availableChannels = DECISION_CONTACT_CHANNELS.filter((channel) =>
    isChannelAvailable(clienteScore, channel)
  );
  const channelScores = DECISION_CONTACT_CHANNELS.map((channel) => getChannelScore(clienteScore, channel));
  const lowScoreAcrossAllChannels =
    channelScores.length > 0 &&
    channelScores.every((score) => Number.isFinite(score) && score < STOP_LOW_SCORE_THRESHOLD);
  const excessiveAttempts = (safeHistory.totalAttempts || 0) > STOP_ATTEMPTS_THRESHOLD;
  const recentRows = (safeHistory.orderedRows || []).slice(0, STOP_RECENT_REJECTION_WINDOW);
  const recentRejectionDetected = recentRows.some(extractRecentRejectionSignal);
  const noAvailableChannels = availableChannels.length === 0;
  const reasons = [];

  if (lowScoreAcrossAllChannels) {
    reasons.push(`todos los canales tienen score menor a ${STOP_LOW_SCORE_THRESHOLD}`);
  }

  if (excessiveAttempts) {
    reasons.push(`intentos totales mayores a ${STOP_ATTEMPTS_THRESHOLD} en 7 días`);
  }

  if (recentRejectionDetected) {
    reasons.push('dictámenes recientes indican rechazo');
  }

  if (noAvailableChannels) {
    reasons.push('no existen canales disponibles');
  }

  return {
    shouldStop: reasons.length > 0,
    reasons,
    lowScoreAcrossAllChannels,
    excessiveAttempts,
    recentRejectionDetected,
    noAvailableChannels
  };
};

export const validateVisitEligibility = ({
  clienteScore = null,
  historyAnalysis = null,
  debtThreshold = DEFAULT_VISIT_DEBT_THRESHOLD,
  now = new Date()
} = {}) => {
  const safeHistory = historyAnalysis || analyzeContactHistory([]);
  const scoreGeneral = toFiniteNumber(clienteScore?.scoreGeneral ?? clienteScore?.score_general, 0);
  const montoDeuda = resolveDebtAmount(clienteScore);
  const distinctChannelsTried = DECISION_CONTACT_CHANNELS.filter(
    (channel) => channel !== VISIT_CHANNEL && safeHistory.stats?.[channel]?.attempts > 0
  ).length;
  const recentAttempts = (safeHistory.orderedRows || [])
    .filter((row) => normalizeText(row?.canal) !== VISIT_CHANNEL)
    .slice(0, VISIT_RECENT_FAILURE_WINDOW);
  const recentAttemptsFailed =
    recentAttempts.length === VISIT_RECENT_FAILURE_WINDOW &&
    recentAttempts.every((row) => FAILURE_RESULTS.has(normalizeText(row?.resultado)));
  const visitChannelState = resolveChannelOperationalState({
    channel: VISIT_CHANNEL,
    clienteScore,
    stats: safeHistory.stats,
    now
  });
  const recentVisitAttempt = (safeHistory.stats?.[VISIT_CHANNEL]?.attempts || 0) > 0;

  const reasons = [];

  if (!visitChannelState.available) {
    reasons.push('canal VISITA no está disponible');
  }

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

  if (visitChannelState.inCooldown || recentVisitAttempt) {
    reasons.push('ya existe una visita reciente');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    scoreGeneral,
    montoDeuda,
    debtThreshold,
    distinctChannelsTried,
    totalAttempts: safeHistory.totalAttempts || 0,
    recentAttemptsFailed,
    visitChannelAvailable: visitChannelState.available,
    recentVisitAttempt
  };
};

const buildCandidate = ({ channel, clienteScore, stats, exploreBonus = 0, forceReason = null, now = new Date() }) => {
  const baseScore = getChannelScore(clienteScore, channel);
  const failurePenalty =
    stats.failAttempts >= FAILED_ATTEMPTS_PENALTY_THRESHOLD
      ? 45 + (stats.failAttempts - FAILED_ATTEMPTS_PENALTY_THRESHOLD) * 10
      : stats.failAttempts * 12;
  const frequencyPenalty = stats.attempts * 6;
  const successBonus = stats.successAttempts > 0 ? 8 : 0;
  const operationalState = resolveChannelOperationalState({
    channel,
    clienteScore,
    stats: { [channel]: stats },
    now
  });
  const adjustedScore =
    baseScore +
    exploreBonus +
    successBonus -
    failurePenalty -
    frequencyPenalty -
    (operationalState.inCooldown ? 35 : 0) -
    (operationalState.reachedAttemptLimit ? 60 : 0) -
    (operationalState.available ? 0 : 100);

  return {
    channel,
    baseScore,
    adjustedScore,
    reason: forceReason,
    stats,
    operationalState
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
  debtThreshold = DEFAULT_VISIT_DEBT_THRESHOLD,
  now = new Date()
} = {}) => {
  const historyAnalysis = analyzeContactHistory(contactHistory);
  const { stats, totalAttempts, totalSuccesses } = historyAnalysis;
  const stopValidation = validateStopContact({
    clienteScore,
    historyAnalysis
  });
  const visitValidation = validateVisitEligibility({
    clienteScore,
    historyAnalysis,
    debtThreshold,
    now
  });
  const playbookStep = resolverSiguientePasoPlaybook({
    contactHistory,
    now
  });
  const operationalStates = Object.fromEntries(
    [...DIGITAL_CHANNELS, CALL_CHANNEL, VISIT_CHANNEL].map((channel) => [
      channel,
      resolveChannelOperationalState({
        channel,
        clienteScore,
        stats,
        now
      })
    ])
  );
  const activeDigitalChannels = DIGITAL_CHANNELS.filter(
    (channel) => operationalStates[channel]?.available
  );

  if (clienteScore?.estrategia?.shouldStopContact === true) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Estrategia actual indica detener contacto',
      prioridad: 'BAJA'
    };
  }

  if (stopValidation.shouldStop) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: `Detener contacto: ${stopValidation.reasons.join('; ')}`,
      prioridad: 'BAJA'
    };
  }

  if (playbookStep?.due && playbookStep.canal === VISIT_CHANNEL) {
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
      razon: `Playbook día ${playbookStep.dia}: visita elegible`,
      prioridad: 'ALTA'
    };
  }

  if (
    playbookStep?.due &&
    playbookStep.canal &&
    playbookStep.canal !== VISIT_CHANNEL &&
    stats[playbookStep.canal]?.failAttempts < FAILED_ATTEMPTS_PENALTY_THRESHOLD &&
    operationalStates[playbookStep.canal]?.eligible
  ) {
    const scheduledScore = getChannelScore(clienteScore, playbookStep.canal);
    return {
      accion: 'CONTACTAR',
      canal: playbookStep.canal,
      razon: playbookStep.razon,
      prioridad: resolvePriority({
        action: 'CONTACTAR',
        score: scheduledScore,
        adjustedScore: scheduledScore,
        exploratory: stats[playbookStep.canal]?.attempts === 0,
        overloaded: totalAttempts >= OVERCONTACT_THRESHOLD
      })
    };
  }

  const unexploredDigitalCandidates = DIGITAL_CHANNELS.map((channel) =>
    buildCandidate({
      channel,
      clienteScore,
      stats: stats[channel],
      exploreBonus: 20,
      forceReason: 'Canal no explorado',
      now
    })
  )
    .filter((candidate) => candidate.stats.attempts === 0 && candidate.operationalState.eligible)
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

  const allDigitalFailed =
    activeDigitalChannels.length > 0 &&
    activeDigitalChannels.every((channel) => {
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

  if (allDigitalFailed && operationalStates[CALL_CHANNEL]?.eligible) {
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
        stats: stats[channel],
        now
      })
    )
    .filter((candidate) => candidate.adjustedScore > 0 && candidate.operationalState.eligible)
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

  const blockedByCooldown = [...DIGITAL_CHANNELS, CALL_CHANNEL].some(
    (channel) => operationalStates[channel]?.available && operationalStates[channel]?.inCooldown
  );
  if (blockedByCooldown) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Ventana de reintento activa',
      prioridad: 'BAJA'
    };
  }

  const blockedByAttemptLimit = [...DIGITAL_CHANNELS, CALL_CHANNEL].every(
    (channel) =>
      !operationalStates[channel]?.available || operationalStates[channel]?.reachedAttemptLimit
  );
  if (blockedByAttemptLimit) {
    return {
      accion: 'DETENER',
      canal: null,
      razon: 'Frecuencia máxima por canal alcanzada',
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

  const referenceDate = toDateOrNull(options.now) || new Date();
  const historyWindowDays = Number.isInteger(options.historyWindowDays) && options.historyWindowDays > 0
    ? options.historyWindowDays
    : DEFAULT_HISTORY_WINDOW_DAYS;
  const historySince = buildDateDaysAgo(referenceDate, historyWindowDays);

  const [clienteScore, contactHistory] = await Promise.all([
    ClienteScore.findOne({ clienteId: clientObjectId })
      .select({
        scoreGeneral: 1,
        canales: 1,
        montoDeuda: 1,
        estrategia: 1
      })
      .lean(),
    ContactHistory.find({
      clienteId: clientObjectId,
      fecha: { $gte: historySince }
    })
      .select({
        canal: 1,
        fecha: 1,
        resultado: 1,
        dictamenId: 1
      })
      .sort({ fecha: -1, _id: -1 })
      .limit(HISTORY_QUERY_LIMIT)
      .lean()
  ]);

  return resolverSiguienteAccion({
    clienteScore,
    contactHistory,
    debtThreshold: options.debtThreshold ?? DEFAULT_VISIT_DEBT_THRESHOLD,
    now: referenceDate
  });
};

export default {
  calcularSiguienteAccion,
  resolverSiguienteAccion,
  analyzeContactHistory,
  validateVisitEligibility,
  validateStopContact
};
