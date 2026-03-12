import { createHttpError } from '../../utils/http-error.js';
import {
  createAddress,
  deleteAddress,
  getAddressById,
  listAddressesByClient,
  updateAddress
} from './addresses.repository.js';
import { resolveClientInternalId, ensureUuid } from './client-id.utils.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';

const normalizeText = (value) => String(value).trim();

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Address already exists for this client');
  }

  throw err;
};

const invalidateClientDetail = async (resolved) => {
  if (!resolved?.client) return;

  await invalidateClientDetailCache({
    portafolioId: resolved.portafolioId,
    clientId: resolved.client.id
  });
};

const requireText = (value, label) => {
  if (!value) {
    throw createHttpError(400, `${label} es requerido`);
  }

  return normalizeText(value);
};

export const listAddressesService = async ({ clientPublicId, limit, offset }) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  return listAddressesByClient({ clientId: resolved.internalId, limit, offset });
};

export const getAddressService = async ({ clientPublicId, addressId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw createHttpError(400, 'Invalid address id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const address = await getAddressById({ clientId: resolved.internalId, addressId });
  if (!address) {
    throw createHttpError(404, 'Address not found');
  }

  return address;
};

export const createAddressService = async ({
  clientPublicId,
  linea1,
  linea2,
  ciudad,
  estado,
  codigoPostal,
  pais
}) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const normalizedLinea1 = requireText(linea1, 'Linea1');
  const normalizedCiudad = requireText(ciudad, 'Ciudad');
  const normalizedEstado = requireText(estado, 'Estado');
  const normalizedCodigoPostal = requireText(codigoPostal, 'Codigo postal');

  try {
    const created = await createAddress({
      clientId: resolved.internalId,
      linea1: normalizedLinea1,
      linea2: linea2 ? normalizeText(linea2) : '',
      ciudad: normalizedCiudad,
      estado: normalizedEstado,
      codigoPostal: normalizedCodigoPostal,
      pais: pais ? normalizeText(pais) : ''
    });

    await invalidateClientDetail(resolved);

    return created;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateAddressService = async ({
  clientPublicId,
  addressId,
  linea1,
  linea2,
  ciudad,
  estado,
  codigoPostal,
  pais
}) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw createHttpError(400, 'Invalid address id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const payload = {};

  if (linea1 !== undefined) {
    payload.linea1 = requireText(linea1, 'Linea1');
  }

  if (linea2 !== undefined) {
    payload.linea2 = linea2 ? normalizeText(linea2) : '';
  }

  if (ciudad !== undefined) {
    payload.ciudad = requireText(ciudad, 'Ciudad');
  }

  if (estado !== undefined) {
    payload.estado = requireText(estado, 'Estado');
  }

  if (codigoPostal !== undefined) {
    payload.codigoPostal = requireText(codigoPostal, 'Codigo postal');
  }

  if (pais !== undefined) {
    payload.pais = pais ? normalizeText(pais) : '';
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  try {
    const updated = await updateAddress({
      clientId: resolved.internalId,
      addressId,
      ...payload
    });

    if (!updated) {
      throw createHttpError(404, 'Address not found');
    }

    await invalidateClientDetail(resolved);
    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteAddressService = async ({ clientPublicId, addressId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw createHttpError(400, 'Invalid address id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const deleted = await deleteAddress({ clientId: resolved.internalId, addressId });
  if (!deleted) {
    throw createHttpError(404, 'Address not found');
  }

  await invalidateClientDetail(resolved);

  return true;
};
