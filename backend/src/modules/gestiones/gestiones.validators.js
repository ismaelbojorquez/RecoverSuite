import pool from '../../config/db.js';
import { getResultadoById } from './resultados.repository.js';
import { resolveClientInternalId } from '../clients/client-id.utils.js';

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
      throw new Error('Credito no encontrado.');
    }
    if (credit.portafolio_id !== portafolioId) {
      throw new Error('El credito no pertenece al portafolio.');
    }
    if (credit.cliente_id !== resolvedClient.internalId) {
      throw new Error('El credito no pertenece al cliente.');
    }
  }

  return resolvedClient;
};

export const ensureResultadoValido = async ({ resultadoId, portafolioId }) => {
  if (!resultadoId) {
    return null;
  }

  const resultado = await getResultadoById(resultadoId);
  if (!resultado) {
    throw new Error('Resultado de gestion no encontrado.');
  }

  if (!resultado.activo) {
    throw new Error('El resultado de gestion no esta activo.');
  }

  if (resultado.portafolio_id !== portafolioId) {
    throw new Error('El resultado de gestion no pertenece al portafolio.');
  }

  return resultado;
};
