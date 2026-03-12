import usePermissions from '../hooks/usePermissions.js';

// UI-only guard; backend must enforce permissions.
export default function Can({
  permission,
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasAnyPermission, hasAllPermissions, hasPermission } = usePermissions();

  if (!permission) {
    return children;
  }

  if (Array.isArray(permission)) {
    const allowed = requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
    return allowed ? children : fallback;
  }

  return hasPermission(permission) ? children : fallback;
}
