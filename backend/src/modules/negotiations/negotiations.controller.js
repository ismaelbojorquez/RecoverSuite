import { createHttpError } from '../../utils/http-error.js';
import { getUserPermissions } from '../permissions/permissions.repository.js';
import {
  createDiscountLevelService,
  createNegotiationService,
  listAvailableDiscountLevelsForUserService,
  listClientNegotiationsService,
  listDiscountLevelsService,
  setDiscountLevelGroupsService,
  updateDiscountLevelService,
  updateNegotiationStatusService
} from './negotiations.service.js';

const adminOverridePermissionSet = new Set([
  'admin.full_access',
  'admin_full_access',
  'admin_full_acess'
]);

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const hasAdminRole = (roles) =>
  Array.isArray(roles) &&
  roles.some((role) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superuser';
  });

const resolveRequestPermissions = async (req, userId) => {
  if (Array.isArray(req.user?.permissions)) {
    return req.user.permissions;
  }

  const permissions = await getUserPermissions(userId);
  if (req.user) {
    req.user.permissions = permissions;
  }
  return permissions;
};

const resolveIsAdmin = async (req, userId) => {
  if (hasAdminRole(req.user?.roles)) {
    return true;
  }

  const permissions = await resolveRequestPermissions(req, userId);
  return permissions.some((permission) =>
    adminOverridePermissionSet.has(String(permission || '').trim())
  );
};

export const listDiscountLevelsHandler = async (req, res, next) => {
  try {
    const includeInactive =
      parseBoolean(req.query.include_inactive) ??
      parseBoolean(req.query.includeInactive) ??
      false;

    const data = await listDiscountLevelsService({ includeInactive });

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const listAvailableDiscountLevelsHandler = async (req, res, next) => {
  try {
    const userId = parseInteger(req.user?.id);
    if (!userId) {
      throw createHttpError(401, 'Unauthorized');
    }

    const isAdmin = await resolveIsAdmin(req, userId);
    const data = await listAvailableDiscountLevelsForUserService({
      userId,
      isAdmin
    });

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const createDiscountLevelHandler = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const created = await createDiscountLevelService(payload);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

export const updateDiscountLevelHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    const payload = req.body || {};
    const updated = await updateDiscountLevelService(id, payload);

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const setDiscountLevelGroupsHandler = async (req, res, next) => {
  try {
    const discountLevelId = parseInteger(req.params.id);
    const groupIds = req.body?.group_ids ?? req.body?.groupIds ?? [];

    await setDiscountLevelGroupsService({
      discountLevelId,
      groupIds
    });

    const data = await listDiscountLevelsService({ includeInactive: true });
    const level = data.find((item) => Number(item.id) === Number(discountLevelId)) || null;

    res.status(200).json({ data: level });
  } catch (err) {
    next(err);
  }
};

export const createNegotiationHandler = async (req, res, next) => {
  try {
    const userId = parseInteger(req.user?.id);
    if (!userId) {
      throw createHttpError(401, 'Unauthorized');
    }

    const body = req.body || {};
    const isAdmin = await resolveIsAdmin(req, userId);

    const created = await createNegotiationService({
      portafolioId: body.portafolio_id ?? body.portafolioId,
      clienteId: body.cliente_id ?? body.clienteId,
      nivelDescuentoId: body.nivel_descuento_id ?? body.nivelDescuentoId,
      creditoIds: body.credito_ids ?? body.creditoIds,
      referencia: body.referencia,
      observaciones: body.observaciones,
      montoBaseTotal: body.monto_base_total ?? body.montoBaseTotal,
      montoNegociadoTotal: body.monto_negociado_total ?? body.montoNegociadoTotal,
      usuarioId: userId,
      isAdmin
    });

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

export const updateNegotiationStatusHandler = async (req, res, next) => {
  try {
    const userId = parseInteger(req.user?.id);
    if (!userId) {
      throw createHttpError(401, 'Unauthorized');
    }

    const negotiationId = parseInteger(req.params.id);
    const body = req.body || {};

    const updated = await updateNegotiationStatusService({
      negotiationId,
      estado: body.estado,
      observaciones: body.observaciones,
      montoNegociadoTotal: body.monto_negociado_total ?? body.montoNegociadoTotal,
      usuarioId: userId
    });

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const listClientNegotiationsHandler = async (req, res, next) => {
  try {
    const clienteId = req.params.clienteId;
    const portafolioId = req.query.portafolio_id ?? req.query.portafolioId;
    const limit = parseInteger(req.query.limit) || 20;
    const offset = parseInteger(req.query.offset) || 0;

    const data = await listClientNegotiationsService({
      clienteId,
      portafolioId,
      limit,
      offset
    });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

