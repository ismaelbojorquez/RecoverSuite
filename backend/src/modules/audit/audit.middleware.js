import { createAuditLog } from './audit.repository.js';

const actionFromMethod = (method) => {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'READ';
    default:
      return method;
  }
};

const isAuditableMethod = (method) =>
  method !== 'OPTIONS' && method !== 'HEAD';

const parseEntity = (req) => {
  const base = req.baseUrl || req.path || '';
  const segments = base.split('/').filter(Boolean);

  if (segments.length === 0) {
    return 'unknown';
  }

  const filtered = segments.filter((segment) => !/^\d+$/.test(segment));
  return filtered[filtered.length - 1] || segments[0];
};

const parseEntityId = (req) => {
  const params = req.params || {};

  if (params.id !== undefined) {
    const parsed = Number.parseInt(params.id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const idKey = Object.keys(params).find((key) => key.toLowerCase().endsWith('id'));
  if (!idKey) {
    return null;
  }

  const parsed = Number.parseInt(params[idKey], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getResponseEntityId = (res) => {
  const data = res.locals?.auditData;
  if (!data) {
    return null;
  }

  if (data?.id !== undefined) {
    const parsed = Number.parseInt(data.id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

export const auditMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) {
      res.locals.auditData = payload.data;
    }
    return originalJson(payload);
  };

  res.on('finish', () => {
    if (!isAuditableMethod(req.method)) {
      return;
    }

    if (res.statusCode < 200 || res.statusCode >= 400) {
      return;
    }

    const entidad = parseEntity(req);
    const entidadId = parseEntityId(req) ?? getResponseEntityId(res);
    const accion = actionFromMethod(req.method);
    const usuarioId = req.user?.id ? String(req.user.id) : null;
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip;

    setImmediate(() => {
      createAuditLog({
        usuarioId,
        accion,
        entidad,
        entidadId,
        fecha: new Date(),
        ip
      }).catch((err) => {
        console.error('Audit log failed', err);
      });
    });
  });

  next();
};
