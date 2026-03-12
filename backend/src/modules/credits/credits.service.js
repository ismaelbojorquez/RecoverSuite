import { createHttpError } from '../../utils/http-error.js';
import {
  createCredit,
  deleteCredit,
  getCreditWithBalances,
  getCreditById,
  listCredits,
  updateCredit
} from './credits.repository.js';
import {
  invalidateClientDetailCache,
  invalidateSearchCache
} from '../../utils/cache.js';
import { resolveClientInternalId } from '../clients/client-id.utils.js';

const normalizeText = (value) => String(value).trim();
const DEFAULT_CREDIT_STATE = 'SIN_ESTADO';
const DEFAULT_CREDIT_PRODUCT = 'SIN_PRODUCTO';

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `ID de ${label} invalido`);
  }
};

const mapCreditToPublic = (row) => ({
  id: row.id,
  cliente_id: row.cliente_public_id,
  cliente_public_id: row.cliente_public_id,
  portafolio_id: row.portafolio_id,
  numero_credito: row.numero_credito,
  numero_credito_externo: row.numero_credito_externo,
  producto: row.producto,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'El credito ya existe en el portafolio');
  }

  throw err;
};

export const listCreditsService = async ({ limit, offset }) => {
  const rows = await listCredits({ limit, offset });
  return rows.map(mapCreditToPublic);
};

export const getCreditByIdService = async (id) => {
  ensurePositiveId(id, 'credito');

  const credit = await getCreditById(id);
  if (!credit) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  return mapCreditToPublic(credit);
};

export const createCreditService = async ({
  clienteId,
  portafolioId,
  numeroCredito,
  producto
}) => {
  ensurePositiveId(portafolioId, 'portafolio');

  if (!numeroCredito) {
    throw createHttpError(400, 'Numero de credito es requerido');
  }

  const { internalId: clientInternalId } = await resolveClientInternalId({
    publicId: clienteId,
    portafolioId
  });

  try {
    const created = await createCredit({
      clienteId: clientInternalId,
      portafolioId,
      numeroCredito: normalizeText(numeroCredito),
      producto: normalizeText(producto || '') || DEFAULT_CREDIT_PRODUCT,
      estado: DEFAULT_CREDIT_STATE
    });

    await invalidateSearchCache(portafolioId);
    await invalidateClientDetailCache({
      portafolioId,
      clientId: clienteId
    });

    return mapCreditToPublic(created);
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateCreditService = async (id, updates) => {
  ensurePositiveId(id, 'credito');

  const payload = {};
  const existing = await getCreditById(id);

  if (!existing) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  if (updates.clienteId !== undefined) {
    const resolved = await resolveClientInternalId({
      publicId: updates.clienteId,
      portafolioId: updates.portafolioId ?? existing.portafolio_id
    });
    payload.clienteId = resolved.internalId;
  }

  if (updates.portafolioId !== undefined) {
    ensurePositiveId(updates.portafolioId, 'portafolio');
    payload.portafolioId = updates.portafolioId;
  }

  if (updates.numeroCredito !== undefined) {
    if (!updates.numeroCredito) {
      throw createHttpError(400, 'Numero de credito es requerido');
    }
    payload.numeroCredito = normalizeText(updates.numeroCredito);
  }

  if (updates.producto !== undefined) {
    payload.producto = normalizeText(updates.producto || '') || DEFAULT_CREDIT_PRODUCT;
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  try {
    const updated = await updateCredit(id, payload);

    if (!updated) {
      throw createHttpError(404, 'Credito no encontrado');
    }

    await invalidateSearchCache(existing.portafolio_id);
    if (updated.portafolio_id !== existing.portafolio_id) {
      await invalidateSearchCache(updated.portafolio_id);
    }

    await invalidateClientDetailCache({
      portafolioId: existing.portafolio_id,
      clientId: existing.cliente_public_id
    });
    if (
      updated.portafolio_id !== existing.portafolio_id ||
      updated.cliente_id !== existing.cliente_id
    ) {
      await invalidateClientDetailCache({
        portafolioId: updated.portafolio_id,
        clientId: updated.cliente_public_id
      });
    }

    return mapCreditToPublic(updated);
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteCreditService = async (id) => {
  ensurePositiveId(id, 'credito');

  const existing = await getCreditById(id);
  if (!existing) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  const deleted = await deleteCredit(id);
  if (!deleted) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  await invalidateSearchCache(existing.portafolio_id);
  await invalidateClientDetailCache({
    portafolioId: existing.portafolio_id,
    clientId: existing.cliente_public_id
  });

  return true;
};

export const getCreditSummaryService = async (id) => {
  ensurePositiveId(id, 'credito');

  const rows = await getCreditWithBalances(id);
  if (!rows.length) {
    throw createHttpError(404, 'Credito no encontrado');
  }

  const credit = {
    id: rows[0].credit_id,
    cliente_id: rows[0].cliente_public_id,
    cliente_public_id: rows[0].cliente_public_id,
    portafolio_id: rows[0].portafolio_id,
    numero_credito: rows[0].numero_credito,
    numero_credito_externo: rows[0].numero_credito_externo,
    producto: rows[0].producto,
    created_at: rows[0].created_at,
    updated_at: rows[0].updated_at
  };

  const balances = rows
    .filter((row) => row.saldo_id)
    .map((row) => ({
      id: row.saldo_id,
      credito_id: row.credit_id,
      campo_saldo_id: row.campo_saldo_id,
      valor: row.valor,
      fecha_actualizacion: row.fecha_actualizacion,
      campo_saldo: {
        id: row.campo_saldo_id,
        nombre_campo: row.nombre_campo,
        etiqueta_visual: row.etiqueta_visual,
        tipo_dato: row.tipo_dato,
        orden: row.orden,
        es_principal: row.es_principal,
        activo: row.activo
      }
    }));

  return { credit, balances };
};
