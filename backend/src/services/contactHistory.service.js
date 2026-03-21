import ContactHistory from '../models/ContactHistory.js';
import { connectMongo } from '../config/mongo.js';
import {
  DECISION_CONTACT_CHANNELS,
  DECISION_CONTACT_HISTORY_RESULTS
} from '../models/decisionEngine.shared.js';
import {
  resolveDecisionClientId,
  resolveDecisionDictamenId,
  resolveDecisionUserId
} from './decisionIdentity.service.js';

const normalizeText = (value) => String(value || '').trim().toUpperCase();

export const mapDictamenTipoContactoToHistoryResult = (value) => {
  const normalized = normalizeText(value);

  switch (normalized) {
    case 'CONTACTADO':
      return 'CONTACTADO';
    case 'RECHAZO':
      return 'RECHAZO';
    case 'NO_CONTACTADO':
      return 'NO_CONTACTADO';
    case 'INVALIDO':
    default:
      return 'NO_CONTACTADO';
  }
};

export const registrarIntento = async (
  clienteId,
  canal,
  resultado,
  dictamenId,
  options = {}
) => {
  await connectMongo();

  const normalizedCanal = normalizeText(canal);
  const normalizedResultado = normalizeText(resultado);

  if (!DECISION_CONTACT_CHANNELS.includes(normalizedCanal)) {
    throw new Error('canal es invalido.');
  }

  if (!DECISION_CONTACT_HISTORY_RESULTS.includes(normalizedResultado)) {
    throw new Error('resultado es invalido.');
  }

  const payload = {
    clienteId: resolveDecisionClientId(clienteId),
    canal: normalizedCanal,
    fecha: options.fecha ? new Date(options.fecha) : new Date(),
    resultado: normalizedResultado,
    dictamenId: resolveDecisionDictamenId(dictamenId, { required: false }),
    agenteId: resolveDecisionUserId(options.agenteId, { required: false })
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
  registrarIntento,
  mapDictamenTipoContactoToHistoryResult
};
