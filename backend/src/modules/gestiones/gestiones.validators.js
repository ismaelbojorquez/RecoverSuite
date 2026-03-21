import pool from '../../config/db.js';
import { resolveClientInternalId } from '../clients/client-id.utils.js';
import { getDictamenById } from '../dictamenes/dictamenes.repository.js';
import { createHttpError } from '../../utils/http-error.js';

export const ensureEntitiesConsistency = async ({ portafolioId, clientePublicId, creditoId }) => {
  const resolvedClient = await resolveClientInternalId({
    publicId: clientePublicId,
    portafolioId
  });

  if (creditoId) {
    const creditResult = await pool.query(
      'SELECT portafolio_id, cliente_id FROM credits WHERE id = $1',
      [creditoId]
    );
    const credit = creditResult.rows[0];
    if (!credit) {
      throw createHttpError(404, 'Credito no encontrado.');
    }
    if (credit.portafolio_id !== portafolioId) {
      throw createHttpError(400, 'El credito no pertenece al portafolio.');
    }
    if (credit.cliente_id !== resolvedClient.internalId) {
      throw createHttpError(400, 'El credito no pertenece al cliente.');
    }
  }

  return resolvedClient;
};

export const ensureDictamenValido = async ({ dictamenId, portafolioId }) => {
  if (!dictamenId) {
    throw createHttpError(400, 'El dictamen es obligatorio.');
  }

  const dictamen = await getDictamenById(dictamenId);
  if (!dictamen) {
    throw createHttpError(404, 'Dictamen no encontrado.');
  }

  if (!dictamen.activo) {
    throw createHttpError(400, 'El dictamen no esta activo.');
  }

  if (dictamen.portafolio_id !== portafolioId) {
    throw createHttpError(400, 'El dictamen no pertenece al portafolio.');
  }

  return dictamen;
};
