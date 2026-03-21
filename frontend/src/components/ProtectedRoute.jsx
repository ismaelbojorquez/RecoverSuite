import { useEffect } from 'react';
import useAuth from '../hooks/useAuth.js';
import usePermissions from '../hooks/usePermissions.js';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';
import AppLoader from './AppLoader.jsx';

export default function ProtectedRoute({ permission, children }) {
  const { ready, isAuthenticated } = useAuth();
  const { hasAnyPermission, hasPermission } = usePermissions();
  const { navigate } = useNavigation();

  const hasRoutePermission = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated) {
      navigate(buildRoutePath('login'), { replace: true });
      return;
    }

    if (permission && !hasRoutePermission) {
      navigate(buildRoutePath('forbidden'), { replace: true });
    }
  }, [ready, isAuthenticated, permission, hasRoutePermission, navigate]);

  if (!ready) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (permission && !hasRoutePermission) {
    return null;
  }

  return children;
}
