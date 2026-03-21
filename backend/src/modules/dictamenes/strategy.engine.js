import {
  CONTACT_SEQUENCE,
  REMOTE_CONTACT_CHANNELS,
  VISIT_CONTACT_CHANNEL,
  normalizeChannel,
  normalizeContactResultType
} from './dictamenes.constants.js';

const toIsoStringOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const roundMetric = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number.parseFloat(value.toFixed(2));
};

const buildEmptyChannelMetric = () => ({
  attempts: 0,
  contacts: 0,
  noContact: 0,
  invalid: 0,
  rejects: 0,
  effectiveness: 0,
  lastAttemptAt: null
});

const buildChannelMetrics = () =>
  CONTACT_SEQUENCE.reduce((accumulator, channel) => {
    accumulator[channel] = buildEmptyChannelMetric();
    return accumulator;
  }, {});

const sortRowsByRecency = (rows) =>
  [...rows].sort((left, right) => {
    const leftDate = new Date(left?.fecha_gestion || 0).getTime();
    const rightDate = new Date(right?.fecha_gestion || 0).getTime();

    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return Number(right?.gestion_id || right?.id || 0) - Number(left?.gestion_id || left?.id || 0);
  });

const getChannelAvailability = (channel, availabilityContext = {}) => {
  switch (channel) {
    case 'LLAMADA':
    case 'WHATSAPP':
    case 'SMS':
      return Boolean(availabilityContext.hasPhone);
    case 'EMAIL':
      return Boolean(availabilityContext.hasEmail);
    case 'VISITA':
      return Boolean(availabilityContext.hasAddress);
    default:
      return false;
  }
};

const buildReasonSet = (...values) => {
  const uniqueValues = new Set(values.filter(Boolean));
  return Array.from(uniqueValues);
};

const buildBasePlan = ({ channelMetrics, availabilityContext, latestChannel, remoteUnsuccessfulStreak }) => ({
  attemptsByChannel: Object.fromEntries(
    Object.entries(channelMetrics).map(([channel, metrics]) => [channel, metrics.attempts])
  ),
  effectivenessByChannel: Object.fromEntries(
    Object.entries(channelMetrics).map(([channel, metrics]) => [channel, metrics.effectiveness])
  ),
  availabilityByChannel: Object.fromEntries(
    CONTACT_SEQUENCE.map((channel) => [channel, getChannelAvailability(channel, availabilityContext)])
  ),
  latestChannel,
  remoteUnsuccessfulStreak,
  rankedChannels: []
});

const resolveRemoteUnsuccessfulStreak = (recentRows = []) => {
  let streak = 0;

  for (const row of recentRows) {
    const channel = normalizeChannel(row?.medio_contacto);
    if (!REMOTE_CONTACT_CHANNELS.includes(channel)) {
      continue;
    }

    const type = normalizeContactResultType(row?.tipo_contacto);
    if (type === 'CONTACTADO') {
      break;
    }

    streak += 1;
  }

  return streak;
};

const rankRemoteChannels = ({
  latestRow,
  availabilityContext,
  channelMetrics,
  latestChannel
}) => {
  const rankedChannels = REMOTE_CONTACT_CHANNELS.filter((channel) =>
    getChannelAvailability(channel, availabilityContext)
  )
    .map((channel) => {
      const metrics = channelMetrics[channel];
      const attemptsPenalty = metrics.attempts * 10;
      const invalidPenalty = metrics.invalid * 24;
      const rejectPenalty = metrics.rejects * 18;
      const sequencePenalty = CONTACT_SEQUENCE.indexOf(channel) * 11;
      const repeatPenalty = latestChannel === channel ? 16 : 0;
      const effectivenessBonus = metrics.effectiveness * 0.45;
      const historicalContactBonus = metrics.contacts > 0 ? 8 : 0;
      const retryBonus =
        latestRow?.recomendar_reintento === true && latestChannel !== channel ? 7 : 0;

      return {
        channel,
        priorityScore: roundMetric(
          100 -
            attemptsPenalty -
            invalidPenalty -
            rejectPenalty -
            sequencePenalty -
            repeatPenalty +
            effectivenessBonus +
            historicalContactBonus +
            retryBonus
        )
      };
    })
    .filter((candidate) => channelMetrics[candidate.channel].invalid < channelMetrics[candidate.channel].attempts || channelMetrics[candidate.channel].attempts === 0)
    .sort((left, right) => right.priorityScore - left.priorityScore);

  return rankedChannels;
};

export const buildEmptyStrategySnapshot = () => ({
  strategy_next_best_action: null,
  strategy_recommended_channel: null,
  strategy_should_stop_contact: false,
  strategy_should_escalate_visit: false,
  strategy_visit_eligible: false,
  strategy_sequence_step: 1,
  strategy_reason_codes: [],
  strategy_contact_plan: buildBasePlan({
    channelMetrics: buildChannelMetrics(),
    availabilityContext: {},
    latestChannel: null,
    remoteUnsuccessfulStreak: 0
  }),
  strategy_actualizado_at: new Date().toISOString()
});

export const calculateClientStrategySnapshot = ({
  rows = [],
  availabilityContext = {},
  scoringSnapshot = {}
}) => {
  const recentRows = sortRowsByRecency(Array.isArray(rows) ? rows : []);
  if (recentRows.length === 0) {
    return buildEmptyStrategySnapshot();
  }

  const latestRow = recentRows[0];
  const latestChannel = normalizeChannel(latestRow?.medio_contacto);
  const latestType = normalizeContactResultType(latestRow?.tipo_contacto);
  const channelMetrics = buildChannelMetrics();

  recentRows.forEach((row) => {
    const channel = normalizeChannel(row?.medio_contacto);
    if (!channel || !channelMetrics[channel]) {
      return;
    }

    const metric = channelMetrics[channel];
    metric.attempts += 1;
    metric.lastAttemptAt = metric.lastAttemptAt || toIsoStringOrNull(row?.fecha_gestion);

    const resultType = normalizeContactResultType(row?.tipo_contacto);
    switch (resultType) {
      case 'CONTACTADO':
        metric.contacts += 1;
        break;
      case 'INVALIDO':
        metric.invalid += 1;
        break;
      case 'RECHAZO':
        metric.rejects += 1;
        break;
      case 'NO_CONTACTADO':
      default:
        metric.noContact += 1;
        break;
    }
  });

  Object.values(channelMetrics).forEach((metric) => {
    metric.effectiveness =
      metric.attempts > 0 ? roundMetric((metric.contacts / metric.attempts) * 100) : 0;
  });

  const remoteMetrics = REMOTE_CONTACT_CHANNELS.map((channel) => channelMetrics[channel]);
  const remoteAttempts = remoteMetrics.reduce((sum, metric) => sum + metric.attempts, 0);
  const remoteContacts = remoteMetrics.reduce((sum, metric) => sum + metric.contacts, 0);
  const remoteEffectiveness =
    remoteAttempts > 0
      ? roundMetric((remoteContacts / remoteAttempts) * 100)
      : 0;
  const remoteUnsuccessfulStreak = resolveRemoteUnsuccessfulStreak(recentRows);

  const isBlockedByFlags =
    latestRow?.bloquear_cliente === true || latestRow?.permitir_contacto === false;
  const isHardStop =
    isBlockedByFlags ||
    (latestType === 'RECHAZO' && latestRow?.recomendar_reintento !== true);

  const rankedChannels = rankRemoteChannels({
    latestRow,
    availabilityContext,
    channelMetrics,
    latestChannel
  });

  const visitEligible =
    getChannelAvailability(VISIT_CONTACT_CHANNEL, availabilityContext) &&
    !isHardStop &&
    remoteAttempts >= 3 &&
    remoteContacts === 0 &&
    remoteUnsuccessfulStreak >= 3;

  const shouldEscalateVisit =
    visitEligible &&
    (remoteAttempts >= 4 ||
      remoteEffectiveness < 25 ||
      latestType === 'NO_CONTACTADO' ||
      latestType === 'INVALIDO');

  const availableRemoteChannels = rankedChannels.map((candidate) => candidate.channel);
  const exhaustedRemoteChannels =
    availableRemoteChannels.length > 0 &&
    availableRemoteChannels.every((channel) => {
      const metric = channelMetrics[channel];
      return metric.invalid >= metric.attempts && metric.attempts > 0;
    });

  const shouldStopContact =
    isHardStop ||
    (!availabilityContext.hasPhone &&
      !availabilityContext.hasEmail &&
      !availabilityContext.hasAddress) ||
    (exhaustedRemoteChannels && !visitEligible);

  let nextBestAction = null;
  let recommendedChannel = null;
  let sequenceStep = 1;
  let reasonCodes = [];

  if (shouldStopContact) {
    nextBestAction = 'DETENER_CONTACTO';
    reasonCodes = buildReasonSet(
      isBlockedByFlags ? 'CONTACT_BLOCKED' : null,
      latestType === 'RECHAZO' ? 'CUSTOMER_REJECTED' : null,
      exhaustedRemoteChannels ? 'REMOTE_CHANNELS_EXHAUSTED' : null,
      !availabilityContext.hasPhone && !availabilityContext.hasEmail && !availabilityContext.hasAddress
        ? 'NO_CONTACT_CAPABILITY'
        : null
    );
  } else if (shouldEscalateVisit) {
    nextBestAction = 'ESCALAR_A_VISITA';
    recommendedChannel = VISIT_CONTACT_CHANNEL;
    sequenceStep = CONTACT_SEQUENCE.indexOf(VISIT_CONTACT_CHANNEL) + 1;
    reasonCodes = buildReasonSet(
      'VISIT_ELIGIBLE',
      remoteContacts === 0 ? 'REMOTE_CONTACT_UNSUCCESSFUL' : null,
      remoteEffectiveness < 25 ? 'LOW_REMOTE_EFFECTIVENESS' : null
    );
  } else if (rankedChannels.length > 0) {
    const preferredChannel = rankedChannels[0];
    recommendedChannel = preferredChannel.channel;
    sequenceStep = CONTACT_SEQUENCE.indexOf(preferredChannel.channel) + 1;
    nextBestAction =
      latestChannel === preferredChannel.channel
        ? `REINTENTAR_${preferredChannel.channel}`
        : `CONTACTAR_${preferredChannel.channel}`;
    reasonCodes = buildReasonSet(
      latestRow?.recomendar_reintento === true ? 'RETRY_RECOMMENDED' : null,
      preferredChannel.priorityScore >= 90 ? 'HIGH_CHANNEL_PRIORITY' : 'CHANNEL_PRIORITY_BALANCED',
      channelMetrics[preferredChannel.channel].contacts > 0 ? 'CHANNEL_PROVEN_EFFECTIVE' : null
    );
  } else {
    nextBestAction = 'DETENER_CONTACTO';
    reasonCodes = buildReasonSet('NO_ELIGIBLE_CHANNELS');
  }

  const contactPlan = buildBasePlan({
    channelMetrics,
    availabilityContext,
    latestChannel,
    remoteUnsuccessfulStreak
  });
  contactPlan.rankedChannels = rankedChannels;
  contactPlan.remoteAttempts = remoteAttempts;
  contactPlan.remoteEffectiveness = remoteEffectiveness;
  contactPlan.latestContactType = latestType;
  contactPlan.currentScore = scoringSnapshot?.score_global ?? null;

  return {
    strategy_next_best_action: nextBestAction,
    strategy_recommended_channel: recommendedChannel,
    strategy_should_stop_contact: shouldStopContact,
    strategy_should_escalate_visit: shouldEscalateVisit,
    strategy_visit_eligible: visitEligible,
    strategy_sequence_step: sequenceStep,
    strategy_reason_codes: reasonCodes,
    strategy_contact_plan: contactPlan,
    strategy_actualizado_at: new Date().toISOString()
  };
};
