import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import { matchRoute, routesById, LAYOUTS } from './routes/router.js';
import { buildRoutePath } from './routes/paths.js';
import useAuth from './hooks/useAuth.js';
import useNavigation from './hooks/useNavigation.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLoader from './components/AppLoader.jsx';

export default function App() {
  const { isAuthenticated, ready } = useAuth();
  const { pathname, navigate } = useNavigation();
  const defaultPath = buildRoutePath('dashboard');
  const match = matchRoute(pathname || defaultPath);
  const resolvedRoute =
    match?.route ||
    routesById.notFound ||
    routesById.dashboard ||
    routesById.login;
  const routeParams = match?.params || {};
  const Layout =
    resolvedRoute.layout === LAYOUTS.auth ? AuthLayout : AppLayout;
  const Page = resolvedRoute.component;
  const isAuthRoute = resolvedRoute.layout === LAYOUTS.auth;

  if (!ready) {
    return <AppLoader />;
  }

  if (!isAuthenticated && !isAuthRoute) {
    if (typeof window !== 'undefined') {
      navigate(buildRoutePath('login'), { replace: true });
    }
    return null;
  }

  if (isAuthenticated && isAuthRoute) {
    if (typeof window !== 'undefined') {
      navigate(buildRoutePath('dashboard'), { replace: true });
    }
    return null;
  }

  const content =
    resolvedRoute.layout === LAYOUTS.auth ? (
      <Page route={resolvedRoute} routeParams={routeParams} />
    ) : (
      <ProtectedRoute permission={resolvedRoute.permission}>
        <Page route={resolvedRoute} routeParams={routeParams} />
      </ProtectedRoute>
    );

  return <Layout>{content}</Layout>;
}
