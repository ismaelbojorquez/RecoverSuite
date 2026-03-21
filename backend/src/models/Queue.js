import mongoose from 'mongoose';
import {
  createChannelCountSchema,
  createStrategySchema,
  createStringEnumField,
  normalizeChannelList,
  queueStateValues,
  DECISION_CONTACT_CHANNELS,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const channelCountSchema = createChannelCountSchema({ defaultValue: 0 });
const strategySchema = createStrategySchema();

const queueSchema = new Schema(
  {
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      index: true,
      alias: 'cliente_id'
    },
    creditoId: {
      type: Schema.Types.ObjectId,
      ref: 'Credito',
      default: undefined,
      index: true,
      alias: 'credito_id'
    },
    portafolioId: {
      type: Schema.Types.ObjectId,
      ref: 'Portafolio',
      default: undefined,
      index: true,
      alias: 'portafolio_id'
    },
    estado: {
      ...createStringEnumField(queueStateValues, {
        required: true,
        default: 'PENDIENTE',
        index: true
      })
    },
    prioridad: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    canalActual: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        default: undefined,
        alias: 'canal_actual',
        index: true
      })
    },
    siguienteCanal: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        default: undefined,
        alias: 'siguiente_canal',
        index: true
      })
    },
    canalesHabilitados: {
      type: [
        {
          type: String,
          enum: DECISION_CONTACT_CHANNELS
        }
      ],
      default: () => [...DECISION_CONTACT_CHANNELS],
      alias: 'canales_habilitados',
      set: normalizeChannelList
    },
    intentosPorCanal: {
      type: channelCountSchema,
      default: () => ({})
    },
    estrategia: {
      type: strategySchema,
      default: () => ({})
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'queues',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

queueSchema.pre('validate', function ensureOrderedChannels(next) {
  this.canalesHabilitados = normalizeChannelList(this.canalesHabilitados);
  next();
});

const Queue = mongoose.models.Queue || mongoose.model('Queue', queueSchema);

export { queueSchema };
export default Queue;
