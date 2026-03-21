import mongoose from 'mongoose';
import {
  createStringEnumField,
  DECISION_CONTACT_CHANNELS,
  DECISION_CONTACT_HISTORY_RESULTS,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const contactHistorySchema = new Schema(
  {
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      alias: 'cliente_id'
    },
    canal: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        required: true
      })
    },
    fecha: {
      type: Date,
      required: true,
      default: Date.now
    },
    resultado: {
      ...createStringEnumField(DECISION_CONTACT_HISTORY_RESULTS, {
        required: true
      })
    },
    dictamenId: {
      type: Schema.Types.ObjectId,
      ref: 'Dictamen',
      default: undefined,
      alias: 'dictamen_id'
    },
    agenteId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      default: undefined,
      alias: 'agente_id'
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'contact_history',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

contactHistorySchema.index(
  { clienteId: 1, fecha: -1, canal: 1, resultado: 1, dictamenId: 1 },
  { name: 'contact_history_recent_strategy_idx' }
);
contactHistorySchema.index(
  { clienteId: 1, canal: 1, fecha: -1, resultado: 1 },
  { name: 'contact_history_channel_timeline_idx' }
);
contactHistorySchema.index(
  { clienteId: 1, fecha: 1, _id: 1 },
  { name: 'contact_history_playbook_idx' }
);

const ContactHistory =
  mongoose.models.ContactHistory || mongoose.model('ContactHistory', contactHistorySchema);

export { contactHistorySchema };
export default ContactHistory;
