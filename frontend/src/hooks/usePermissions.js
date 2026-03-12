import { useCallback, useMemo } from 'react';
import useAuth from './useAuth.js';

const normalizePermissions = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

const normalizeGroups = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((group) => {
      if (typeof group === 'string') {
        const name = group.trim();
        return name ? { id: null, name } : null;
      }

      if (group && typeof group === 'object') {
        const id =
          group.id !== undefined && group.id !== null && String(group.id).trim()
            ? String(group.id).trim()
            : null;
        const nameSource = group.name || group.nombre || group.key || group.group || '';
        const name = String(nameSource || '').trim();

        if (!name && !id) {
          return null;
        }

        return {
          id,
          name: name || id
        };
      }

      return null;
    })
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  normalized.forEach((group) => {
    const key = `${group.id || ''}::${group.name || ''}`.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(group);
  });

  return deduped;
};

const ADMIN_OVERRIDE_PERMISSIONS = new Set([
  'admin.full_access',
  'admin_full_access',
  'admin_full_acess'
]);

export default function usePermissions() {
  const { user } = useAuth();
  const roles = useMemo(() => normalizePermissions(user?.roles), [user]);
  const permissions = useMemo(() => normalizePermissions(user?.permissions), [user]);
  const groups = useMemo(() => normalizeGroups(user?.groups), [user]);
  const groupNames = useMemo(
    () =>
      groups
        .map((group) => String(group.name || '').trim())
        .filter(Boolean),
    [groups]
  );
  const hasAdminOverridePermission = useMemo(
    () => permissions.some((permission) => ADMIN_OVERRIDE_PERMISSIONS.has(permission)),
    [permissions]
  );
  const isAdmin =
    roles.includes('admin') || roles.includes('superuser') || hasAdminOverridePermission;
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) {
        return true;
      }

      if (isAdmin) {
        return true;
      }

      return permissionSet.has(permission);
    },
    [isAdmin, permissionSet]
  );

  const hasAnyPermission = useCallback(
    (required) => {
      const list = normalizePermissions(required);
      if (list.length === 0) {
        return true;
      }

      if (isAdmin) {
        return true;
      }

      return list.some((permission) => permissionSet.has(permission));
    },
    [isAdmin, permissionSet]
  );

  const hasAllPermissions = useCallback(
    (required) => {
      const list = normalizePermissions(required);
      if (list.length === 0) {
        return true;
      }

      if (isAdmin) {
        return true;
      }

      return list.every((permission) => permissionSet.has(permission));
    },
    [isAdmin, permissionSet]
  );

  return {
    permissions,
    roles,
    groups,
    groupNames,
    isAdmin,
    isAuthenticated: Boolean(user),
    tokenPayload: user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can: hasPermission,
    canAny: hasAnyPermission
  };
}
