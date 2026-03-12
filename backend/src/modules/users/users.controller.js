import {
  createUserService,
  changePasswordService,
  deleteUserService,
  getUserByIdService,
  resetPasswordService,
  listUsersService,
  updateUserService
} from './users.service.js';
import { createHttpError } from '../../utils/http-error.js';
import { logUserAuditEvent } from './user-audit.repository.js';

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const resolveActorId = (req) => {
  if (req.user?.id !== undefined) {
    const parsed = Number.parseInt(req.user.id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const resolveIp = (req) =>
  req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip;

const auditUserAction = (req, { action, targetUserId, metadata }) => {
  const actorId = resolveActorId(req);
  const ip = resolveIp(req);
  setImmediate(() => {
    logUserAuditEvent({
      actorUserId: actorId,
      targetUserId,
      action,
      ip,
      metadata
    }).catch((err) => {
      console.error('User audit log failed', err);
    });
  });
};

export const listUsersHandler = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInteger(req.query.limit, 25), 1), 100);
    const offset = Math.max(parseInteger(req.query.offset, 0), 0);

    const users = await listUsersService({ limit, offset });

    res.status(200).json({ data: users, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getUserHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const user = await getUserByIdService(id);

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const createUserHandler = async (req, res, next) => {
  try {
    const {
      email: emailRaw,
      username,
      name,
      nombre,
      password,
      is_active: isActiveRaw,
      isActive: isActiveAlt,
      groupId,
      group_id: groupIdSnake,
      groups
    } = req.body || {};

    const email = emailRaw || username;
    const normalizedUsername = email;
    const displayName = name ?? nombre ?? null;
    const normalizedGroupId =
      groupId !== undefined
        ? groupId
        : groupIdSnake !== undefined
          ? groupIdSnake
          : Array.isArray(groups) && groups.length > 0
            ? groups[0]
            : undefined;
    const isActive = parseBoolean(isActiveRaw ?? isActiveAlt);

    const user = await createUserService({
      email,
      username: normalizedUsername,
      name: displayName,
      password,
      isActive: isActive !== undefined ? isActive : true,
      groupId: normalizedGroupId
    });

    auditUserAction(req, {
      action: 'create',
      targetUserId: user?.id,
      metadata: { username: user?.username || username || email }
    });

    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const updateUserHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const {
      email: emailRaw,
      username,
      name,
      nombre,
      password,
      is_active: isActiveRaw,
      isActive: isActiveAlt,
      groupId,
      group_id: groupIdSnake,
      groups
    } = req.body || {};

    const email = emailRaw || username;
    const normalizedUsername = email;
    const displayName = name ?? nombre ?? null;
    const normalizedGroupId =
      groupId !== undefined
        ? groupId
        : groupIdSnake !== undefined
          ? groupIdSnake
          : Array.isArray(groups) && groups.length > 0
            ? groups[0]
            : undefined;
    const isActive = parseBoolean(isActiveRaw ?? isActiveAlt);

    if (req.user && Number.parseInt(req.user.id, 10) === id && isActive === false) {
      throw createHttpError(400, 'No puedes desactivar tu propio usuario');
    }

    const user = await updateUserService(id, {
      email,
      username: normalizedUsername,
      name: displayName,
      password,
      isActive,
      groupId: normalizedGroupId
    });

    auditUserAction(req, {
      action: 'update',
      targetUserId: user?.id || id,
      metadata: { username: user?.username || username || email }
    });

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const deleteUserHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (req.user && Number.parseInt(req.user.id, 10) === id) {
      throw createHttpError(400, 'No puedes eliminar tu propio usuario');
    }

    await deleteUserService(id);

    auditUserAction(req, {
      action: 'delete',
      targetUserId: id
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const activateUserHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const user = await updateUserService(id, { isActive: true });
    auditUserAction(req, {
      action: 'activate',
      targetUserId: user?.id || id,
      metadata: { username: user?.username }
    });
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const deactivateUserHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (req.user && Number.parseInt(req.user.id, 10) === id) {
      throw createHttpError(400, 'No puedes desactivar tu propio usuario');
    }
    const user = await updateUserService(id, { isActive: false });
    auditUserAction(req, {
      action: 'deactivate',
      targetUserId: user?.id || id,
      metadata: { username: user?.username }
    });
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { tempPassword, user } = await resetPasswordService(id);
    auditUserAction(req, {
      action: 'reset_password',
      targetUserId: user?.id || id,
      metadata: { username: user?.username }
    });
    res.status(200).json({ data: { user, tempPassword } });
  } catch (err) {
    next(err);
  }
};

export const changePasswordHandler = async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.user?.id, 10);
    if (!userId) {
      throw createHttpError(401, 'No autenticado');
    }
    const { current_password: currentPassword, currentPassword: curPwdAlt, new_password: newPassword, newPassword: newPwdAlt } = req.body || {};
    const current = currentPassword ?? curPwdAlt;
    const nextPwd = newPassword ?? newPwdAlt;
    const user = await changePasswordService({
      userId,
      currentPassword: current,
      newPassword: nextPwd
    });
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};
