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
      index: true,
      alias: 'cliente_id'
    },
    canal: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        required: true,
        index: true
      })
    },
    fecha: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    resultado: {
      ...createStringEnumField(DECISION_CONTACT_HISTORY_RESULTS, {
        required: true,
        index: true
      })
    },
    dictamenId: {
      type: Schema.Types.ObjectId,
      ref: 'Dictamen',
      default: undefined,
      index: true,
      alias: 'dictamen_id'
    },
    agenteId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      default: undefined,
      index: true,
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

contactHistorySchema.index({ clienteId: 1, fecha: -1 });
contactHistorySchema.index({ clienteId: 1, canal: 1, fecha: -1 });
contactHistorySchema.index({ clienteId: 1, resultado: 1, fecha: -1 });

const ContactHistory =
  mongoose.models.ContactHistory || mongoose.model('ContactHistory', contactHistorySchema);

export { contactHistorySchema };
export default ContactHistory;
