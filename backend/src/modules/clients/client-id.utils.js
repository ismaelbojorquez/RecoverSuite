import { createHttpError } from '../../utils/http-error.js';
import { getClientByPublicId } from './clients.repository.js';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ensureUuid = (value, label = 'id') => {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!uuidRegex.test(normalized)) {
    throw createHttpError(400, `ID de ${label} invalido`);
  }

  return normalized.toLowerCase();
};

export const resolveClientInternalId = async ({ publicId, portafolioId = null }) => {
  ensureUuid(publicId, 'cliente');

  const client = await getClientByPublicId(publicId);
  if (!client) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  if (portafolioId !== null && portafolioId !== undefined) {
    if (!Number.isInteger(portafolioId) || portafolioId <= 0) {
      throw createHttpError(400, 'Portafolio invalido');
    }
    if (client.portafolio_id !== portafolioId) {
      throw createHttpError(400, 'El cliente no pertenece al portafolio indicado');
    }
  }

  return {
    internalId: client.internal_id,
    portafolioId: client.portafolio_id,
    client
  };
};
