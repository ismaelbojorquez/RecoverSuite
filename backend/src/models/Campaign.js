import mongoose from 'mongoose';
import {
  createScoreField,
  createStringEnumField,
  DECISION_CONTACT_CHANNELS,
  DECISION_RISK_LEVELS,
  normalizeChannelList,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const campaignStateValues = Object.freeze(['GENERADA', 'EXPORTADA']);

const campaignFiltersSchema = new Schema(
  {
    riesgo: {
      ...createStringEnumField(DECISION_RISK_LEVELS, {
        default: undefined
      })
    },
    scoreMin: {
      ...createScoreField(),
      alias: 'score_min',
      default: undefined
    },
    scoreMax: {
      ...createScoreField(),
      alias: 'score_max',
      default: undefined
    },
    portafolioId: {
      type: Number,
      min: 1,
      alias: 'portafolio_id',
      default: undefined
    }
  },
  {
    _id: false,
    id: false
  }
);

const campaignFilesSchema = new Schema(
  {
    llamada: {
      type: String,
      trim: true,
      default: undefined
    },
    whatsapp: {
      type: String,
      trim: true,
      default: undefined
    },
    sms: {
      type: String,
      trim: true,
      default: undefined
    },
    email: {
      type: String,
      trim: true,
      default: undefined
    },
    visita: {
      type: String,
      trim: true,
      default: undefined
    }
  },
  {
    _id: false,
    id: false
  }
);

const campaignSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    fechaCreacion: {
      type: Date,
      required: true,
      default: Date.now,
      alias: 'fecha_creacion',
      index: true
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      alias: 'creado_por',
      index: true
    },
    filtros: {
      type: campaignFiltersSchema,
      default: () => ({})
    },
    canales: {
      type: [
        {
          type: String,
          enum: DECISION_CONTACT_CHANNELS
        }
      ],
      default: () => [...DECISION_CONTACT_CHANNELS],
      set: normalizeChannelList
    },
    totalClientes: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
      alias: 'total_clientes'
    },
    estado: {
      ...createStringEnumField(campaignStateValues, {
        required: true,
        default: 'GENERADA',
        index: true
      })
    },
    archivos: {
      type: campaignFilesSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'campaigns',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

campaignSchema.pre('validate', function validateCampaignRanges(next) {
  if (
    Number.isFinite(this.filtros?.scoreMin) &&
    Number.isFinite(this.filtros?.scoreMax) &&
    this.filtros.scoreMin > this.filtros.scoreMax
  ) {
    next(new Error('scoreMin no puede ser mayor a scoreMax.'));
    return;
  }

  this.canales = normalizeChannelList(this.canales);

  if (!this.fechaCreacion) {
    this.fechaCreacion = new Date();
  }

  next();
});

campaignSchema.index(
  { creadoPor: 1, fechaCreacion: -1 },
  { name: 'campaign_created_by_fecha_creacion_idx' }
);
campaignSchema.index(
  { estado: 1, fechaCreacion: -1 },
  { name: 'campaign_estado_fecha_creacion_idx' }
);

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

export { campaignSchema, campaignStateValues };
export default Campaign;
