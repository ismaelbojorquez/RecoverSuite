import { createHttpError } from '../../utils/http-error.js';
import { getUserPermissions, getUserGroups } from './permissions.repository.js';

const unauthorized = () => createHttpError(401, 'Unauthorized');
const forbidden = () => createHttpError(403, 'Forbidden');
const adminOverridePermissionSet = new Set([
  'admin.full_access',
  'admin_full_access',
  'admin_full_acess'
]);

const hasAdminRole = (roles) =>
  Array.isArray(roles) &&
  roles.some((role) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superuser';
  });

const hasAdminOverridePermission = (permissions) =>
  Array.isArray(permissions) &&
  permissions.some((permission) => adminOverridePermissionSet.has(String(permission || '').trim()));

const normalizePermissions = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
};

const loadPermissionsIntoRequest = async (req) => {
  if (req.permissions && Array.isArray(req.permissions)) {
    return req.permissions;
  }
  const userId = Number.parseInt(req.user?.id, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw unauthorized();
  }
  const perms = await getUserPermissions(userId);
  req.permissions = perms;
  req.user.permissions = perms;
  req.user.groups = req.user.groups || (await getUserGroups(userId));
  return perms;
};

export const requirePermissions = (required) => async (req, res, next) => {
  try {
    if (!req.user) {
      throw unauthorized();
    }

    if (hasAdminRole(req.user.roles)) {
      return next();
    }

    const requiredPermissions = normalizePermissions(required);
    if (requiredPermissions.length === 0) {
      return next();
    }

    const permissions = await loadPermissionsIntoRequest(req);
    if (hasAdminOverridePermission(permissions)) {
      return next();
    }

    const hasPermission = requiredPermissions.some((permission) =>
      permissions.includes(permission)
    );

    if (!hasPermission) {
      throw forbidden();
    }

    return next();
  } catch (err) {
    return next(err.statusCode ? err : forbidden());
  }
};

// Compatibilidad con el middleware previo
export const authorize = requirePermissions;
