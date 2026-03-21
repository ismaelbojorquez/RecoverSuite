export const CONTACT_CHANNELS = ['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA'];
export const REMOTE_CONTACT_CHANNELS = ['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL'];
export const VISIT_CONTACT_CHANNEL = 'VISITA';

export const CHANNEL_SCORE_FIELDS = Object.freeze({
  LLAMADA: 'score_llamada',
  WHATSAPP: 'score_whatsapp',
  SMS: 'score_sms',
  EMAIL: 'score_email',
  VISITA: 'score_visita'
});

export const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO'];
export const CONTACT_RESULT_TYPES = ['CONTACTADO', 'NO_CONTACTADO', 'INVALIDO', 'RECHAZO'];
export const CONTACT_SEQUENCE = ['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA'];

export const normalizeEnum = (value) => String(value || '').trim().toUpperCase();

export const normalizeChannel = (value) => {
  const normalized = normalizeEnum(value);
  return CONTACT_CHANNELS.includes(normalized) ? normalized : null;
};

export const normalizeRiskLevel = (value) => {
  const normalized = normalizeEnum(value);
  return RISK_LEVELS.includes(normalized) ? normalized : null;
};

export const normalizeContactResultType = (value) => {
  const normalized = normalizeEnum(value);
  return CONTACT_RESULT_TYPES.includes(normalized) ? normalized : null;
};

export const parseOptionalScore = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const ensureScoreInRange = (value, label) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} debe estar entre 0 y 100.`);
  }

  return value;
};

export const resolveDictamenScores = ({
  scoreGlobal,
  scoreLlamada,
  scoreWhatsapp,
  scoreSms,
  scoreEmail,
  scoreVisita
}) => {
  const safeGlobal = ensureScoreInRange(scoreGlobal, 'El score global');

  return {
    scoreGlobal: safeGlobal,
    scoreLlamada: ensureScoreInRange(scoreLlamada ?? safeGlobal, 'El score de llamada'),
    scoreWhatsapp: ensureScoreInRange(scoreWhatsapp ?? safeGlobal, 'El score de WhatsApp'),
    scoreSms: ensureScoreInRange(scoreSms ?? safeGlobal, 'El score de SMS'),
    scoreEmail: ensureScoreInRange(scoreEmail ?? safeGlobal, 'El score de Email'),
    scoreVisita: ensureScoreInRange(scoreVisita ?? safeGlobal, 'El score de visita')
  };
};
