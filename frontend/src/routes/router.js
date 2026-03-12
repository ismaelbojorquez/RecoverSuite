import { publicRoutes } from './public.js';
import { privateRoutes, navSections } from './private.js';
import { matchPath } from './paths.js';

export const LAYOUTS = {
  app: 'app',
  auth: 'auth'
};

export const routes = [
  ...publicRoutes.map((route) => ({ ...route, layout: LAYOUTS.auth })),
  ...privateRoutes.map((route) => ({ ...route, layout: LAYOUTS.app }))
];

export const routesById = routes.reduce((acc, route) => {
  acc[route.id] = route;
  return acc;
}, {});

export const matchRoute = (pathname) => {
  for (const route of routes) {
    const match = matchPath(pathname, route.path);
    if (match) {
      return { route, params: match.params };
    }
  }
  const catchAll = routes.find((route) => route.path === '*');
  if (catchAll) {
    return { route: catchAll, params: {} };
  }
  return null;
};

export { navSections };
