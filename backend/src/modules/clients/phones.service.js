import { createHttpError } from '../../utils/http-error.js';
import {
  createPhone,
  deletePhone,
  getPhoneById,
  listPhonesByClient,
  updatePhone
} from './phones.repository.js';
import { resolveClientInternalId, ensureUuid } from './client-id.utils.js';
import {
  invalidateClientDetailCache,
  invalidateSearchCache
} from '../../utils/cache.js';

const normalizePhone = (value) => String(value).trim().replace(/\D/g, '');

const isValidPhone = (value) => /^\d{6,20}$/.test(value);

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Phone already exists for this client');
  }

  throw err;
};

const invalidateClientCaches = async (resolved) => {
  if (!resolved?.client) {
    return;
  }

  await invalidateClientDetailCache({
    portafolioId: resolved.portafolioId,
    clientId: resolved.client.id
  });
  await invalidateSearchCache(resolved.portafolioId);
};

export const listPhonesService = async ({ clientPublicId, limit, offset }) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  return listPhonesByClient({ clientId: resolved.internalId, limit, offset });
};

export const getPhoneService = async ({ clientPublicId, phoneId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(phoneId) || phoneId <= 0) {
    throw createHttpError(400, 'Invalid phone id');
  }

  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const phone = await getPhoneById({ clientId: resolved.internalId, phoneId });
  if (!phone) {
    throw createHttpError(404, 'Phone not found');
  }

  return phone;
};

export const createPhoneService = async ({ clientPublicId, telefono }) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  if (!telefono) {
    throw createHttpError(400, 'Telefono es requerido');
  }

  const normalized = normalizePhone(telefono);
  if (!isValidPhone(normalized)) {
    throw createHttpError(400, 'Telefono invalido');
  }

  try {
    const created = await createPhone({ clientId: resolved.internalId, telefono: normalized });
    await invalidateClientCaches(resolved);
    return created;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updatePhoneService = async ({ clientPublicId, phoneId, telefono }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(phoneId) || phoneId <= 0) {
    throw createHttpError(400, 'Invalid phone id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  if (!telefono) {
    throw createHttpError(400, 'Telefono es requerido');
  }

  const normalized = normalizePhone(telefono);
  if (!isValidPhone(normalized)) {
    throw createHttpError(400, 'Telefono invalido');
  }

  try {
    const updated = await updatePhone({
      clientId: resolved.internalId,
      phoneId,
      telefono: normalized
    });

    if (!updated) {
      throw createHttpError(404, 'Phone not found');
    }

    await invalidateClientCaches(resolved);
    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deletePhoneService = async ({ clientPublicId, phoneId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(phoneId) || phoneId <= 0) {
    throw createHttpError(400, 'Invalid phone id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const deleted = await deletePhone({ clientId: resolved.internalId, phoneId });
  if (!deleted) {
    throw createHttpError(404, 'Phone not found');
  }

  await invalidateClientCaches(resolved);

  return true;
};
