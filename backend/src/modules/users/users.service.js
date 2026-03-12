import bcrypt from 'bcryptjs';
import env from '../../config/env.js';
import { createHttpError } from '../../utils/http-error.js';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
  countActiveAdmins,
  isUserAdmin,
  getUserWithPassword
} from './users.repository.js';
import crypto from 'node:crypto';
import pool from '../../config/db.js';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const ensurePositiveId = (id) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'Invalid user id');
  }
};

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'Email o username ya existe');
  }

  throw err;
};

const ensureAdminRemains = async (targetUserId, db = pool) => {
  const isAdmin = await isUserAdmin(targetUserId, db);
  if (!isAdmin) {
    return;
  }

  const activeAdmins = await countActiveAdmins(db);
  // Si el usuario objetivo es admin y es el último activo, bloquear
  if (activeAdmins <= 1) {
    throw createHttpError(409, 'No se puede desactivar/eliminar al último administrador activo');
  }
};

const generateTemporaryPassword = () =>
  crypto.randomBytes(6).toString('base64url'); // ~8 chars, adjust length/entropy as needed

const withAdminLock = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [987654321]); // serialize admin-sensitive ops
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
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

export const listUsersService = async ({ limit, offset }) => {
  return listUsers({ limit, offset });
};

export const getUserByIdService = async (id) => {
  ensurePositiveId(id);

  const user = await getUserById(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return user;
};

export const createUserService = async ({
  email,
  username,
  name,
  password,
  isActive,
  groupId
}) => {
  const finalEmail = normalizeEmail(email || username);
  const finalUsername = finalEmail;

  if (!finalEmail || !password) {
    throw createHttpError(400, 'Email y password son requeridos');
  }

  if (username && email && normalizeEmail(username) !== finalEmail) {
    throw createHttpError(400, 'El usuario es el email: deben coincidir');
  }

  if (groupId === undefined || groupId === null) {
    throw createHttpError(400, 'El usuario debe tener al menos un grupo asignado');
  }

  const passwordHash = await bcrypt.hash(
    String(password),
    env.security.passwordSaltRounds
  );

  try {
    return await createUser(
      {
        username: finalUsername,
        email: finalEmail,
        nombre: name ? String(name).trim() : null,
        passwordHash,
        isActive: isActive !== undefined ? isActive : true,
        requiereCambioPassword: false,
        groupId
      }
    );
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateUserService = async (id, updates) => {
  ensurePositiveId(id);

  const payload = {};
  let togglingActive = false;
  let targetUser;

  if (updates.email !== undefined || updates.username !== undefined) {
    const finalEmail = updates.email
      ? normalizeEmail(updates.email)
      : updates.username
        ? normalizeEmail(updates.username)
        : undefined;

    if (updates.email !== undefined && !finalEmail) {
      throw createHttpError(400, 'Email es requerido');
    }

    if (
      updates.email !== undefined &&
      updates.username !== undefined &&
      normalizeEmail(updates.username) !== finalEmail
    ) {
      throw createHttpError(400, 'El usuario es el email: deben coincidir');
    }

    if (finalEmail !== undefined) {
      payload.username = finalEmail;
      payload.email = finalEmail;
    }
  }

  if (updates.name !== undefined) {
    payload.nombre = updates.name ? String(updates.name).trim() : null;
  }

  if (updates.password !== undefined) {
    if (!updates.password) {
      throw createHttpError(400, 'Password es requerido');
    }
    payload.passwordHash = await bcrypt.hash(
      String(updates.password),
      env.security.passwordSaltRounds
    );
  }

  if (updates.isActive !== undefined) {
    togglingActive = true;
    payload.estado = updates.isActive ? 'activo' : 'inactivo';
  }

  if (updates.groupId !== undefined) {
    if (updates.groupId === null) {
      throw createHttpError(400, 'El usuario debe tener al menos un grupo asignado');
    }
    payload.groupId = updates.groupId;
  }

  if (updates.requiere_cambio_password !== undefined) {
    payload.requiereCambioPassword = Boolean(updates.requiere_cambio_password);
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No updates provided');
  }

  const performUpdate = async (db) => {
    targetUser = targetUser || (await getUserById(id, db));
    if (!targetUser) {
      throw createHttpError(404, 'User not found');
    }

    // validar grupo existente si no viene en payload
    if (payload.groupId === undefined) {
      if (!targetUser.group_id) {
        throw createHttpError(400, 'El usuario debe tener al menos un grupo asignado');
      }
    }

    if (togglingActive && payload.estado === 'inactivo') {
      await ensureAdminRemains(id, db);
    }

    const updated = await updateUser(id, payload, db);

    if (!updated) {
      throw createHttpError(404, 'User not found');
    }

    return updated;
  };

  try {
    if (togglingActive) {
      return await withAdminLock(performUpdate);
    }
    return await performUpdate(pool);
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteUserService = async (id) => {
  ensurePositiveId(id);

  const performDelete = async (db) => {
    const user = await getUserById(id, db);
    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    await ensureAdminRemains(id, db);

    const deleted = await deleteUser(id, db);
    if (!deleted) {
      throw createHttpError(404, 'User not found');
    }

    return true;
  };

  if (await isUserAdmin(id)) {
    return withAdminLock((client) => performDelete(client));
  }

  return performDelete(pool);
};

export const resetPasswordService = async (id) => {
  ensurePositiveId(id);
  const user = await getUserWithPassword(id);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(
    String(tempPassword),
    env.security.passwordSaltRounds
  );

  const updated = await updateUser(id, {
    passwordHash,
    requiereCambioPassword: true
  });

  if (!updated) {
    throw createHttpError(404, 'User not found');
  }

  return { user: updated, tempPassword };
};

export const changePasswordService = async ({ userId, currentPassword, newPassword }) => {
  ensurePositiveId(userId);
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, 'Contraseña actual y nueva son requeridas');
  }

  const user = await getUserWithPassword(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const matches = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!matches) {
    throw createHttpError(400, 'Contraseña actual incorrecta');
  }

  const passwordHash = await bcrypt.hash(
    String(newPassword),
    env.security.passwordSaltRounds
  );

  const updated = await updateUser(userId, {
    passwordHash,
    requiereCambioPassword: false
  });

  if (!updated) {
    throw createHttpError(404, 'User not found');
  }

  return updated;
};
