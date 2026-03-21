import { CHANNEL_SCORE_FIELDS, CONTACT_CHANNELS, normalizeChannel } from './dictamenes.constants.js';

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundScore = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number.parseFloat(value.toFixed(2));
};

export const inferRiskLevelFromScore = (value) => {
  const score = toFiniteNumber(value);
  if (score === null) {
    return null;
  }

  if (score >= 70) {
    return 'BAJO';
  }

  if (score >= 40) {
    return 'MEDIO';
  }

  return 'ALTO';
};

const sortRowsByRecency = (rows) =>
  [...rows].sort((left, right) => {
    const leftDate = new Date(left?.fecha_gestion || 0).getTime();
    const rightDate = new Date(right?.fecha_gestion || 0).getTime();

    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return Number(right?.gestion_id || right?.id || 0) - Number(left?.gestion_id || left?.id || 0);
  });

const resolveChannelScore = (row, channel) => {
  const field = CHANNEL_SCORE_FIELDS[channel];
  return toFiniteNumber(row?.[field]) ?? toFiniteNumber(row?.score_global);
};

export const buildEmptyScoringSnapshot = () => ({
  score_global: null,
  score_llamada: null,
  score_whatsapp: null,
  score_sms: null,
  score_email: null,
  score_visita: null,
  scoring_riesgo_nivel: null,
  scoring_permitir_contacto: null,
  scoring_bloquear_cliente: null,
  scoring_recomendar_reintento: null,
  scoring_actualizado_at: new Date().toISOString()
});

export const calculateClientScoringSnapshot = (rows = []) => {
  const recentRows = sortRowsByRecency(Array.isArray(rows) ? rows : []);

  if (recentRows.length === 0) {
    return buildEmptyScoringSnapshot();
  }

  const chronologicalRows = [...recentRows].reverse();
  const channelScores = CONTACT_CHANNELS.reduce((acc, channel) => {
    acc[channel] = 0;
    return acc;
  }, {});

  chronologicalRows.forEach((row) => {
    const channel = normalizeChannel(row?.medio_contacto);
    if (!channel) {
      return;
    }

    const nextChannelScore = resolveChannelScore(row, channel);
    if (nextChannelScore === null) {
      return;
    }

    const previousScore = toFiniteNumber(channelScores[channel]) ?? 0;
    channelScores[channel] = roundScore(previousScore * 0.7 + nextChannelScore * 0.3) ?? 0;
  });

  const latest = recentRows[0];
  const scoreGlobal = roundScore(
    CONTACT_CHANNELS.reduce((sum, channel) => sum + (toFiniteNumber(channelScores[channel]) ?? 0), 0) /
      CONTACT_CHANNELS.length
  );

  return {
    score_global: scoreGlobal,
    score_llamada: roundScore(channelScores.LLAMADA),
    score_whatsapp: roundScore(channelScores.WHATSAPP),
    score_sms: roundScore(channelScores.SMS),
    score_email: roundScore(channelScores.EMAIL),
    score_visita: roundScore(channelScores.VISITA),
    scoring_riesgo_nivel: inferRiskLevelFromScore(scoreGlobal),
    scoring_permitir_contacto:
      latest?.permitir_contacto === null || latest?.permitir_contacto === undefined
        ? null
        : Boolean(latest.permitir_contacto),
    scoring_bloquear_cliente:
      latest?.bloquear_cliente === null || latest?.bloquear_cliente === undefined
        ? null
        : Boolean(latest.bloquear_cliente),
    scoring_recomendar_reintento:
      latest?.recomendar_reintento === null || latest?.recomendar_reintento === undefined
        ? null
        : Boolean(latest.recomendar_reintento),
    scoring_actualizado_at: new Date().toISOString()
  };
};
