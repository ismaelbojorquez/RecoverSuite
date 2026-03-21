import mongoose from 'mongoose';
import {
  createStringEnumField,
  DECISION_CONTACT_CHANNELS,
  schemaSerializationOptions
} from './decisionEngine.shared.js';

const { Schema } = mongoose;

const gestionSchema = new Schema(
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
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
      alias: 'usuario_id'
    },
    medioContacto: {
      ...createStringEnumField(DECISION_CONTACT_CHANNELS, {
        required: true,
        alias: 'medio_contacto',
        index: true
      })
    },
    dictamenId: {
      type: Schema.Types.ObjectId,
      ref: 'Dictamen',
      required: true,
      index: true,
      alias: 'dictamen_id'
    },
    comentarios: {
      type: String,
      required: true,
      trim: true,
      alias: 'comentario'
    },
    fechaGestion: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
      alias: 'fecha_gestion'
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'gestiones',
    toJSON: schemaSerializationOptions,
    toObject: schemaSerializationOptions
  }
);

const Gestion = mongoose.models.Gestion || mongoose.model('Gestion', gestionSchema);

export { gestionSchema };
export default Gestion;
