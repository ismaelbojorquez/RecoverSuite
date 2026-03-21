import mongoose from 'mongoose';
import {
  createChannelScoreSchema,
  createScoreField,
  createStrategySchema,
  createStringEnumField,
  DECISION_RISK_LEVELS,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const channelScoreSchema = createChannelScoreSchema({ defaultValue: undefined });
const strategySchema = createStrategySchema();

const clienteScoreSchema = new Schema(
  {
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      unique: true,
      index: true,
      alias: 'cliente_id'
    },
    scoreGeneral: {
      ...createScoreField(),
      alias: 'score_general',
      default: undefined
    },
    montoDeuda: {
      type: Number,
      min: 0,
      alias: 'monto_deuda',
      default: undefined
    },
    canales: {
      type: channelScoreSchema,
      default: () => ({})
    },
    riesgo: {
      ...createStringEnumField(DECISION_RISK_LEVELS, {
        default: undefined,
        index: true
      })
    },
    estrategia: {
      type: strategySchema,
      default: () => ({})
    },
    ultimaActualizacion: {
      type: Date,
      default: Date.now,
      alias: 'ultima_actualizacion'
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'cliente_scores',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

clienteScoreSchema.pre('validate', function syncGeneralScore(next) {
  const channelValues = [
    this.canales?.llamada,
    this.canales?.whatsapp,
    this.canales?.sms,
    this.canales?.email,
    this.canales?.visita
  ].filter((value) => Number.isFinite(value));

  if (!Number.isFinite(this.scoreGeneral) && channelValues.length > 0) {
    const average = channelValues.reduce((sum, value) => sum + value, 0) / channelValues.length;
    this.scoreGeneral = Number.parseFloat(average.toFixed(2));
  }

  if (!this.ultimaActualizacion) {
    this.ultimaActualizacion = new Date();
  }

  next();
});

const ClienteScore =
  mongoose.models.ClienteScore || mongoose.model('ClienteScore', clienteScoreSchema);

export { clienteScoreSchema };
export default ClienteScore;
