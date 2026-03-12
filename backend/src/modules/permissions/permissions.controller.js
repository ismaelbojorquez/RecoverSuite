import {
  createPermissionService,
  deletePermissionService,
  getPermissionByIdService,
  listPermissionsService,
  updatePermissionService
} from './permissions.service.js';

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

export const listPermissionsHandler = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInteger(req.query.limit, 25), 1), 100);
    const offset = Math.max(parseInteger(req.query.offset, 0), 0);

    const permissions = await listPermissionsService({ limit, offset, orderByKey: true });

    res.status(200).json({ data: permissions, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getPermissionHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const permission = await getPermissionByIdService(id);

    res.status(200).json({ data: permission });
  } catch (err) {
    next(err);
  }
};

export const createPermissionHandler = async (req, res, next) => {
  try {
    const { key, label, description, is_active: isActiveRaw } = req.body || {};
    const isActive = parseBoolean(isActiveRaw);

    const permission = await createPermissionService({
      key,
      label,
      description,
      isActive
    });

    res.status(201).json({ data: permission });
  } catch (err) {
    next(err);
  }
};

export const updatePermissionHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { key, label, description, is_active: isActiveRaw } = req.body || {};
    const isActive = parseBoolean(isActiveRaw);

    const permission = await updatePermissionService(id, {
      key,
      label,
      description,
      isActive
    });

    res.status(200).json({ data: permission });
  } catch (err) {
    next(err);
  }
};

export const deletePermissionHandler = async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);

    await deletePermissionService(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
