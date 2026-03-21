import mongoose from 'mongoose';
import {
  createChannelCountSchema,
  createStrategySchema,
  createStringEnumField,
  normalizeChannelList,
  queueStateValues,
  DECISION_ACTION_TYPES,
  DECISION_CONTACT_CHANNELS,
  DECISION_PRIORITY_LEVELS,
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
    prioridadEtiqueta: {
      ...createStringEnumField(DECISION_PRIORITY_LEVELS, {
        default: 'MEDIA',
        alias: 'prioridad_etiqueta',
        index: true
      })
    },
    accion: {
      ...createStringEnumField(DECISION_ACTION_TYPES, {
        default: 'CONTACTAR',
        index: true
      })
    },
    canal: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        default: undefined,
        index: true
      })
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
    },
    razon: {
      type: String,
      trim: true,
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

  if (!this.canal && this.siguienteCanal) {
    this.canal = this.siguienteCanal;
  }

  if (!this.siguienteCanal && this.canal) {
    this.siguienteCanal = this.canal;
  }

  next();
});

queueSchema.index(
  { clienteId: 1, estado: 1, updatedAt: -1 },
  { name: 'queue_active_cliente_estado_updated_idx' }
);
queueSchema.index(
  { estado: 1, prioridad: -1, updatedAt: -1 },
  { name: 'queue_dispatch_estado_prioridad_updated_idx' }
);

const Queue = mongoose.models.Queue || mongoose.model('Queue', queueSchema);

export { queueSchema };
export default Queue;
