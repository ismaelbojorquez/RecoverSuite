import mongoose from 'mongoose';
import ContactHistory from '../models/ContactHistory.js';
import {
  DECISION_CONTACT_CHANNELS,
  DECISION_CONTACT_HISTORY_RESULTS
} from '../models/decisionEngine.shared.js';

const normalizeText = (value) => String(value || '').trim().toUpperCase();

const toObjectIdOrThrow = (value, label, { required = true } = {}) => {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${label} es obligatorio.`);
    }

    return undefined;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (!mongoose.isValidObjectId(value)) {
    throw new Error(`${label} es invalido.`);
  }

  return new mongoose.Types.ObjectId(value);
};

export const registrarIntento = async (
  clienteId,
  canal,
  resultado,
  dictamenId,
  options = {}
) => {
  const normalizedCanal = normalizeText(canal);
  const normalizedResultado = normalizeText(resultado);

  if (!DECISION_CONTACT_CHANNELS.includes(normalizedCanal)) {
    throw new Error('canal es invalido.');
  }

  if (!DECISION_CONTACT_HISTORY_RESULTS.includes(normalizedResultado)) {
    throw new Error('resultado es invalido.');
  }

  const payload = {
    clienteId: toObjectIdOrThrow(clienteId, 'clienteId'),
    canal: normalizedCanal,
    fecha: options.fecha ? new Date(options.fecha) : new Date(),
    resultado: normalizedResultado,
    dictamenId: toObjectIdOrThrow(dictamenId, 'dictamenId', { required: false }),
    agenteId: toObjectIdOrThrow(options.agenteId, 'agenteId', { required: false })
  };

  if (Number.isNaN(payload.fecha.getTime())) {
    throw new Error('fecha es invalida.');
  }

  const intento = new ContactHistory(payload);
  await intento.validate();
  await intento.save();
  return intento;
};

export default {
  registrarIntento
};
