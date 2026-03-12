import { createHttpError } from '../../utils/http-error.js';
import {
  createPermission,
  deletePermission,
  getPermissionById,
  listPermissions,
  updatePermission
} from './permissions.repository.js';

const normalizeKey = (value) => String(value).trim();

const ensurePositiveId = (id) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'Invalid permission id');
  }
};

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Permission key already exists');
  }

  throw err;
};

export const listPermissionsService = async ({ limit, offset, orderByKey = false }) => {
  return listPermissions({ limit, offset, orderByKey });
};

export const getPermissionByIdService = async (id) => {
  ensurePositiveId(id);

  const permission = await getPermissionById(id);
  if (!permission) {
    throw createHttpError(404, 'Permission not found');
  }

  return permission;
};

export const createPermissionService = async ({ key, description, isActive }) => {
  if (!key) {
    throw createHttpError(400, 'Permission key is required');
  }

  try {
    return await createPermission({
      key: normalizeKey(key),
      description: description ? String(description).trim() : null,
      isActive: isActive !== undefined ? isActive : true
    });
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updatePermissionService = async (id, updates) => {
  ensurePositiveId(id);

  const payload = {};

  if (updates.key !== undefined) {
    if (!updates.key) {
      throw createHttpError(400, 'Permission key is required');
    }
    payload.key = normalizeKey(updates.key);
  }

  if (updates.description !== undefined) {
    payload.description = updates.description ? String(updates.description).trim() : null;
  }

  if (updates.isActive !== undefined) {
    payload.isActive = updates.isActive;
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  try {
    const updated = await updatePermission(id, payload);

    if (!updated) {
      throw createHttpError(404, 'Permission not found');
    }

    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deletePermissionService = async (id) => {
  ensurePositiveId(id);

  const deleted = await deletePermission(id);
  if (!deleted) {
    throw createHttpError(404, 'Permission not found');
  }

  return true;
};
