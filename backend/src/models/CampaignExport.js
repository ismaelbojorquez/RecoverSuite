import mongoose from 'mongoose';
import {
  createStringEnumField,
  schemaSerializationOptions
} from './decisionEngine.shared.js';
import { CONTACT_CHANNELS } from '../modules/dictamenes/dictamenes.constants.js';

const { Schema } = mongoose;

const campaignExportStatusValues = Object.freeze([
  'PENDIENTE',
  'PROCESANDO',
  'COMPLETADO',
  'ERROR'
]);

const campaignExportFilterSchema = new Schema(
  {
    channels: {
      type: [
        {
          type: String,
          enum: CONTACT_CHANNELS
        }
      ],
      default: undefined
    },
    limit: {
      type: Number,
      min: 1,
      default: undefined
    },
    debtThreshold: {
      type: Number,
      min: 0,
      alias: 'debt_threshold',
      default: undefined
    },
    historyWindowDays: {
      type: Number,
      min: 1,
      alias: 'history_window_days',
      default: undefined
    }
  },
  {
    _id: false,
    id: false
  }
);

const campaignExportFileSchema = new Schema(
  {
    channel: {
      ...createStringEnumField(CONTACT_CHANNELS, {
        required: true,
        index: true
      })
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      alias: 'file_name'
    },
    relativePath: {
      type: String,
      required: true,
      trim: true,
      alias: 'relative_path'
    },
    sizeBytes: {
      type: Number,
      min: 0,
      alias: 'size_bytes',
      default: 0
    },
    recordCount: {
      type: Number,
      min: 0,
      alias: 'record_count',
      default: 0
    },
    checksum: {
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

const campaignExportSummarySchema = new Schema(
  {
    totalClients: {
      type: Number,
      min: 0,
      alias: 'total_clients',
      default: 0
    },
    totalEligible: {
      type: Number,
      min: 0,
      alias: 'total_eligible',
      default: 0
    },
    totalSkipped: {
      type: Number,
      min: 0,
      alias: 'total_skipped',
      default: 0
    },
    totalFiles: {
      type: Number,
      min: 0,
      alias: 'total_files',
      default: 0
    },
    byChannel: {
      type: Map,
      of: Number,
      alias: 'by_channel',
      default: () => ({})
    }
  },
  {
    _id: false,
    id: false
  }
);

const campaignExportSchema = new Schema(
  {
    jobId: {
      type: Number,
      alias: 'job_id',
      default: undefined,
      index: true
    },
    portafolioId: {
      type: Number,
      required: true,
      alias: 'portafolio_id',
      index: true
    },
    createdBy: {
      type: Number,
      required: true,
      alias: 'created_by',
      index: true
    },
    status: {
      ...createStringEnumField(campaignExportStatusValues, {
        required: true,
        default: 'PENDIENTE',
        index: true
      })
    },
    filters: {
      type: campaignExportFilterSchema,
      default: () => ({})
    },
    summary: {
      type: campaignExportSummarySchema,
      default: () => ({})
    },
    files: {
      type: [campaignExportFileSchema],
      default: () => []
    },
    exportDir: {
      type: String,
      trim: true,
      alias: 'export_dir',
      default: undefined
    },
    manifestPath: {
      type: String,
      trim: true,
      alias: 'manifest_path',
      default: undefined
    },
    startedAt: {
      type: Date,
      alias: 'started_at',
      default: undefined
    },
    finishedAt: {
      type: Date,
      alias: 'finished_at',
      default: undefined
    },
    error: {
      type: String,
      trim: true,
      default: undefined
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'campaign_exports',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

campaignExportSchema.index(
  { portafolioId: 1, createdAt: -1 },
  { name: 'campaign_exports_portafolio_created_idx' }
);
campaignExportSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'campaign_exports_status_created_idx' }
);

const CampaignExport =
  mongoose.models.CampaignExport || mongoose.model('CampaignExport', campaignExportSchema);

export { campaignExportSchema, campaignExportStatusValues };
export default CampaignExport;
