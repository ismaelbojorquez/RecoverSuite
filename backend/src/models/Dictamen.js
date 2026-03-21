import mongoose from 'mongoose';
import {
  createBooleanField,
  createChannelScoreSchema,
  createScoreField,
  createStringEnumField,
  DECISION_CONTACT_RESULT_TYPES,
  DECISION_RISK_LEVELS,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const channelScoreSchema = createChannelScoreSchema({ defaultValue: undefined });

const dictamenSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    descripcion: {
      type: String,
      trim: true,
      default: undefined
    },
    tipoContacto: {
      ...createStringEnumField(DECISION_CONTACT_RESULT_TYPES, {
        required: true,
        default: 'NO_CONTACTADO',
        alias: 'tipo_contacto',
        index: true
      })
    },
    riesgo: {
      ...createStringEnumField(DECISION_RISK_LEVELS, {
        required: true,
        default: 'MEDIO',
        index: true
      })
    },
    score: {
      ...createScoreField({ required: true })
    },
    canales: {
      type: channelScoreSchema,
      default: () => ({})
    },
    permiteContacto: {
      ...createBooleanField({ defaultValue: true }),
      alias: 'permitir_contacto'
    },
    recomendarReintento: {
      ...createBooleanField({ defaultValue: false }),
      alias: 'recomendar_reintento'
    },
    bloquearCliente: {
      ...createBooleanField({ defaultValue: false }),
      alias: 'bloquear_cliente'
    },
    activo: {
      ...createBooleanField({ defaultValue: true }),
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'dictamenes',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

dictamenSchema.pre('validate', function hydrateChannelScores(next) {
  const fallbackScore = Number.isFinite(this.score) ? this.score : undefined;
  if (fallbackScore === undefined) {
    return next();
  }

  const currentChannels = this.canales || {};
  for (const channel of ['llamada', 'whatsapp', 'sms', 'email', 'visita']) {
    if (currentChannels[channel] === undefined || currentChannels[channel] === null) {
      currentChannels[channel] = fallbackScore;
    }
  }

  this.canales = currentChannels;
  next();
});

dictamenSchema.index({ nombre: 1, activo: 1 });

const Dictamen = mongoose.models.Dictamen || mongoose.model('Dictamen', dictamenSchema);

export { dictamenSchema };
export default Dictamen;
