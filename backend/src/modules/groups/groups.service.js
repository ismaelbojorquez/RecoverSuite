import { createHttpError } from '../../utils/http-error.js';
import {
  addPermissionToGroup,
  addUserToGroup,
  createGroup,
  deleteGroup,
  getGroupById,
  listGroupPermissions,
  listGroupUsers,
  listGroups,
  removePermissionFromGroup,
  removeUserFromGroup,
  updateGroup,
  countAdminGroups,
  isAdminGroup,
  countActiveAdminUsers,
  replaceGroupPermissions,
  permissionsExist,
  userHasAdminGroup
} from './groups.repository.js';
import pool from '../../config/db.js';
import { getUserById } from '../users/users.repository.js';

const normalizeName = (value) => String(value ?? '').trim();

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'El nombre del grupo ya existe');
  }

  throw err;
};

export const listGroupsService = async ({ limit, offset }) => {
  return listGroups({ limit, offset });
};

export const getGroupByIdService = async (id) => {
  ensurePositiveId(id, 'group');

  const group = await getGroupById(id);
  if (!group) {
    throw createHttpError(404, 'Group not found');
  }

  return group;
};

export const createGroupService = async ({ name, description, is_admin_group: isAdminGroupFlag, isAdminGroup: isAdminGroupAlt }) => {
  const normalizedName = normalizeName(name) || normalizeName(description);
  if (!normalizedName) {
    throw createHttpError(400, 'El nombre del grupo es requerido');
  }

  const isAdminGroupValue = isAdminGroupFlag ?? isAdminGroupAlt ?? false;

  try {
    return await createGroup({
      name: normalizedName,
      description: description ? String(description).trim() : null,
      isAdminGroup: Boolean(isAdminGroupValue)
    });
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateGroupService = async (id, updates) => {
  ensurePositiveId(id, 'group');

  const current = await getGroupById(id);
  if (!current) {
    throw createHttpError(404, 'Group not found');
  }

  const payload = {};

  if (updates.name !== undefined) {
    const normalizedName = normalizeName(updates.name) || normalizeName(updates.description);
    if (!normalizedName) {
      throw createHttpError(400, 'El nombre del grupo es requerido');
    }
    payload.name = normalizedName;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description ? String(updates.description).trim() : null;
  }

  if (updates.is_admin_group !== undefined || updates.isAdminGroup !== undefined) {
    payload.isAdminGroup = Boolean(updates.is_admin_group ?? updates.isAdminGroup);
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  // Validaciones de admin
  if (payload.isAdminGroup === false && current.is_admin_group) {
    const admins = await countAdminGroups();
    if (admins <= 1) {
      throw createHttpError(409, 'No se puede desmarcar el último grupo administrador');
    }
    const remainingAdmins = await countActiveAdminUsers(pool, { excludeGroupId: id });
    if (remainingAdmins <= 0) {
      throw createHttpError(
        409,
        'No puedes desmarcar este grupo como administrador porque dejarías el sistema sin usuarios administradores activos'
      );
    }
  }

  try {
    const updated = await updateGroup(id, payload);

    if (!updated) {
      throw createHttpError(404, 'Group not found');
    }

    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteGroupService = async (id) => {
  ensurePositiveId(id, 'group');

  const group = await getGroupById(id);
  if (!group) {
    throw createHttpError(404, 'Group not found');
  }

  if (group.is_admin_group) {
    const admins = await countAdminGroups();
    if (admins <= 1) {
      throw createHttpError(409, 'No se puede eliminar el último grupo administrador');
    }
    const remainingAdmins = await countActiveAdminUsers(pool, { excludeGroupId: id });
    if (remainingAdmins <= 0) {
      throw createHttpError(
        409,
        'No puedes eliminar este grupo porque dejarías el sistema sin usuarios administradores activos'
      );
    }
  }

  const deleted = await deleteGroup(id);
  if (!deleted) {
    throw createHttpError(404, 'Group not found');
  }

  return true;
};

export const listGroupPermissionsService = async (groupId) => {
  ensurePositiveId(groupId, 'group');
  return listGroupPermissions(groupId);
};

export const replaceGroupPermissionsService = async (groupId, permissionIds) => {
  ensurePositiveId(groupId, 'group');
  if (!Array.isArray(permissionIds)) {
    throw createHttpError(400, 'permissionIds debe ser un arreglo');
  }
  const ids = permissionIds.map((id) => Number.parseInt(id, 10)).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length !== permissionIds.length) {
    throw createHttpError(400, 'permissionIds contiene valores inválidos');
  }

  const group = await getGroupById(groupId);
  if (!group) {
    throw createHttpError(404, 'Group not found');
  }

  const client = await pool.connect();
  try {
    const exists = await permissionsExist(ids, client);
    if (!exists) {
      throw createHttpError(400, 'Al menos un permiso no existe');
    }
    await replaceGroupPermissions({ groupId, permissionIds: ids }, client);
    return true;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

export const addPermissionToGroupService = async (groupId, permissionId) => {
  ensurePositiveId(groupId, 'group');
  ensurePositiveId(permissionId, 'permission');

  return addPermissionToGroup(groupId, permissionId);
};

export const removePermissionFromGroupService = async (groupId, permissionId) => {
  ensurePositiveId(groupId, 'group');
  ensurePositiveId(permissionId, 'permission');

  return removePermissionFromGroup(groupId, permissionId);
};

export const listGroupUsersService = async (groupId) => {
  ensurePositiveId(groupId, 'group');
  return listGroupUsers(groupId);
};

export const addUserToGroupService = async (groupId, userId) => {
  ensurePositiveId(groupId, 'group');
  ensurePositiveId(userId, 'user');

  const group = await getGroupById(groupId);
  if (!group) {
    throw createHttpError(404, 'Group not found');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return addUserToGroup(groupId, userId);
};

export const removeUserFromGroupService = async (groupId, userId, currentUserId) => {
  ensurePositiveId(groupId, 'group');
  ensurePositiveId(userId, 'user');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const group = await getGroupById(groupId);
    if (!group) {
      throw createHttpError(404, 'Group not found');
    }

    const user = await getUserById(userId, client);
    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    const isTargetAdminGroup = await isAdminGroup(groupId, client);
    const userIsActive = user.estado === 'activo';

    if (isTargetAdminGroup && userIsActive) {
      const userHasOtherAdmin = await userHasAdminGroup(userId, client, { excludeGroupId: groupId });
      if (!userHasOtherAdmin) {
        const remainingAdmins = await countActiveAdminUsers(client, { excludeGroupId: groupId });
        if (remainingAdmins <= 0) {
          throw createHttpError(
            409,
            'No puedes remover a este usuario: dejarías al sistema sin administradores activos'
          );
        }
      }

      if (currentUserId && Number(currentUserId) === userId && !userHasOtherAdmin) {
        throw createHttpError(
          409,
          'No puedes removerte de tu último grupo administrador; se perderían tus privilegios'
        );
      }
    }

    await removeUserFromGroup(groupId, userId);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
};
