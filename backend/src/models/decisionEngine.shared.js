import mongoose from 'mongoose';
import {
  CONTACT_CHANNELS,
  CONTACT_RESULT_TYPES,
  RISK_LEVELS
} from '../modules/dictamenes/dictamenes.constants.js';

const { Schema } = mongoose;

const normalizeNullableString = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
};

const normalizeNullableEnumString = (value) => {
  const normalized = normalizeNullableString(value);
  return normalized ? normalized.toUpperCase() : undefined;
};

const normalizeNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const normalizeBoolean = (defaultValue = false) => (value) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  return Boolean(value);
};

export const DECISION_CONTACT_CHANNELS = Object.freeze([...CONTACT_CHANNELS]);
export const DECISION_REMOTE_CHANNELS = Object.freeze(
  CONTACT_CHANNELS.filter((channel) => channel !== 'VISITA')
);
export const DECISION_CONTACT_RESULT_TYPES = Object.freeze([...CONTACT_RESULT_TYPES]);
export const DECISION_CONTACT_HISTORY_RESULTS = Object.freeze([
  'CONTACTADO',
  'NO_CONTACTADO',
  'RECHAZO',
  'SIN_RESPUESTA'
]);
export const DECISION_RISK_LEVELS = Object.freeze([...RISK_LEVELS]);

export const queueStateValues = Object.freeze([
  'PENDIENTE',
  'EN_PROCESO',
  'PAUSADO',
  'COMPLETADO',
  'DETENIDO'
]);

export const createScoreField = ({ required = false } = {}) => ({
  type: Number,
  min: 0,
  max: 100,
  required,
  set: normalizeNullableNumber
});

export const createBooleanField = ({ defaultValue = false } = {}) => ({
  type: Boolean,
  default: defaultValue,
  set: normalizeBoolean(defaultValue)
});

export const createStringEnumField = (values, options = {}) => ({
  type: String,
  enum: values,
  trim: true,
  set: normalizeNullableEnumString,
  ...options
});

export const createChannelScoreSchema = ({ required = false, defaultValue } = {}) =>
  new Schema(
    {
      llamada: {
        ...createScoreField({ required }),
        default: defaultValue
      },
      whatsapp: {
        ...createScoreField({ required }),
        default: defaultValue
      },
      sms: {
        ...createScoreField({ required }),
        default: defaultValue
      },
      email: {
        ...createScoreField({ required }),
        default: defaultValue
      },
      visita: {
        ...createScoreField({ required }),
        default: defaultValue
      }
    },
    {
      _id: false,
      id: false
    }
  );

export const createChannelCountSchema = ({ defaultValue = 0 } = {}) =>
  new Schema(
    {
      llamada: {
        type: Number,
        min: 0,
        default: defaultValue,
        set: normalizeNullableNumber
      },
      whatsapp: {
        type: Number,
        min: 0,
        default: defaultValue,
        set: normalizeNullableNumber
      },
      sms: {
        type: Number,
        min: 0,
        default: defaultValue,
        set: normalizeNullableNumber
      },
      email: {
        type: Number,
        min: 0,
        default: defaultValue,
        set: normalizeNullableNumber
      },
      visita: {
        type: Number,
        min: 0,
        default: defaultValue,
        set: normalizeNullableNumber
      }
    },
    {
      _id: false,
      id: false
    }
  );

export const createStrategySchema = () =>
  new Schema(
    {
      nextBestAction: {
        type: String,
        trim: true,
        default: undefined,
        alias: 'next_best_action',
        set: normalizeNullableString
      },
      recommendedChannel: {
        ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
          alias: 'recommended_channel',
          default: undefined,
          index: true
        })
      },
      shouldStopContact: {
        ...createBooleanField({ defaultValue: false }),
        alias: 'should_stop_contact'
      },
      shouldEscalateVisit: {
        ...createBooleanField({ defaultValue: false }),
        alias: 'should_escalate_visit'
      },
      visitEligible: {
        ...createBooleanField({ defaultValue: false }),
        alias: 'visit_eligible'
      },
      sequenceStep: {
        type: Number,
        min: 1,
        default: 1,
        alias: 'sequence_step',
        set: normalizeNullableNumber
      },
      reasonCodes: {
        type: [String],
        default: [],
        alias: 'reason_codes'
      },
      contactPlan: {
        type: Schema.Types.Mixed,
        default: undefined,
        alias: 'contact_plan'
      }
    },
    {
      _id: false,
      id: false
    }
  );

export const normalizeChannelList = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [...DECISION_CONTACT_CHANNELS];
  }

  const normalized = values
    .map((value) => normalizeNullableString(value)?.toUpperCase())
    .filter((value) => DECISION_CONTACT_CHANNELS.includes(value));

  return DECISION_CONTACT_CHANNELS.filter((channel) => normalized.includes(channel));
};

export const schemaSerializationOptions = Object.freeze({
  virtuals: true,
  versionKey: false
});
