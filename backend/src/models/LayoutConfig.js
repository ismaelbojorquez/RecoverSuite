import mongoose from 'mongoose';

const { Schema } = mongoose;

const layoutConfigSchema = new Schema(
  {
    page: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true
    },
    userRef: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    groupKey: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      index: true
    },
    layout: {
      type: [Schema.Types.Mixed],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'layout_configs'
  }
);

layoutConfigSchema.index(
  { page: 1, role: 1, groupKey: 1, userRef: 1, userId: 1 },
  { unique: true }
);

const LayoutConfig = mongoose.models.LayoutConfig || mongoose.model('LayoutConfig', layoutConfigSchema);

export default LayoutConfig;
