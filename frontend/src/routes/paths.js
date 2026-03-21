const ROUTE_PATHS = {
  login: '/login',
  recover: '/recover',
  dashboard: '/',
  portfolios: '/portfolios',
  clients: '/clients',
  clientDetail: '/clients/:id',
  credits: '/credits',
  clientImport: '/imports/clients',
  creditImport: '/imports/credits',
  balances: '/balances',
  profile: '/profile',
  users: '/users',
  audit: '/audit',
  groups: '/groups',
  negotiationSettings: '/negotiations/settings',
  dictamenes: '/dictamenes',
  permissions: '/permissions',
  balanceFields: '/balance-fields',
  forbidden: '/403',
  notFound: '*'
};

const normalizePath = (path) => {
  if (!path) {
    return '/';
  }

  const trimmed = path.split('?')[0].split('#')[0];
  const normalized =
    trimmed.length > 1 ? trimmed.replace(/\/+$/, '') : trimmed;
  return normalized || '/';
};

const splitPath = (path) => normalizePath(path).split('/').filter(Boolean);

export const matchPath = (pathname, template) => {
  const pathSegments = splitPath(pathname);

  if (template === '*') {
    return { params: {} };
  }

  const templateSegments = splitPath(template);

  if (pathSegments.length !== templateSegments.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < templateSegments.length; index += 1) {
    const segment = templateSegments[index];
    const value = pathSegments[index];

    if (segment.startsWith(':')) {
      const key = segment.slice(1);
      params[key] = decodeURIComponent(value);
      continue;
    }

    if (segment !== value) {
      return null;
    }
  }

  return { params };
};

export const buildPath = (template, params = {}, query = {}) => {
  let path = template;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    path = path.replace(`:${key}`, encodeURIComponent(String(value)));
  });

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const buildRoutePath = (routeId, params = {}, query = {}) => {
  const template = ROUTE_PATHS[routeId] || '/';
  return buildPath(template, params, query);
};

export const getRouteParams = (routeId, pathname) => {
  const template = ROUTE_PATHS[routeId];
  if (!template) {
    return null;
  }

  const match = matchPath(pathname, template);
  return match ? match.params : null;
};

export { ROUTE_PATHS };
