import { createHttpError } from '../../utils/http-error.js';
import {
  createEmail,
  deleteEmail,
  getEmailById,
  listEmailsByClient,
  updateEmail
} from './emails.repository.js';
import { resolveClientInternalId, ensureUuid } from './client-id.utils.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';

const normalizeEmail = (value) => String(value).trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Email already exists for this client');
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

export const listEmailsService = async ({ clientPublicId, limit, offset }) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  return listEmailsByClient({ clientId: resolved.internalId, limit, offset });
};

export const getEmailService = async ({ clientPublicId, emailId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(emailId) || emailId <= 0) {
    throw createHttpError(400, 'Invalid email id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const email = await getEmailById({ clientId: resolved.internalId, emailId });
  if (!email) {
    throw createHttpError(404, 'Email not found');
  }

  return email;
};

export const createEmailService = async ({ clientPublicId, email }) => {
  ensureUuid(clientPublicId, 'cliente');
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  if (!email) {
    throw createHttpError(400, 'Email es requerido');
  }

  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw createHttpError(400, 'Email invalido');
  }

  try {
    const created = await createEmail({ clientId: resolved.internalId, email: normalized });
    await invalidateClientDetail(resolved);
    return created;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateEmailService = async ({ clientPublicId, emailId, email }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(emailId) || emailId <= 0) {
    throw createHttpError(400, 'Invalid email id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  if (!email) {
    throw createHttpError(400, 'Email es requerido');
  }

  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw createHttpError(400, 'Email invalido');
  }

  try {
    const updated = await updateEmail({
      clientId: resolved.internalId,
      emailId,
      email: normalized
    });

    if (!updated) {
      throw createHttpError(404, 'Email not found');
    }

    await invalidateClientDetail(resolved);
    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteEmailService = async ({ clientPublicId, emailId }) => {
  ensureUuid(clientPublicId, 'cliente');
  if (!Number.isInteger(emailId) || emailId <= 0) {
    throw createHttpError(400, 'Invalid email id');
  }
  const resolved = await resolveClientInternalId({ publicId: clientPublicId });

  const deleted = await deleteEmail({ clientId: resolved.internalId, emailId });
  if (!deleted) {
    throw createHttpError(404, 'Email not found');
  }

  await invalidateClientDetail(resolved);

  return true;
};
