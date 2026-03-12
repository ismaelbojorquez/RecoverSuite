import {
  addUserToGroupService,
  createGroupService,
  deleteGroupService,
  getGroupByIdService,
  listGroupPermissionsService,
  replaceGroupPermissionsService,
  listGroupUsersService,
  listGroupsService,
  removePermissionFromGroupService,
  removeUserFromGroupService,
  updateGroupService
} from './groups.service.js';

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

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveGroupName = (body = {}, query = {}, headers = {}) => {
  const candidates = [
    body.name,
    body.nombre,
    body.group_name,
    body.nombre_grupo,
    body.title,
    body.group?.name,
    body.group?.nombre,
    query.name,
    query.nombre,
    query.group_name,
    query.nombre_grupo,
    query.title,
    headers['x-group-name'],
    headers['x-name'],
    headers['x-title']
  ];
  const value = candidates.find((v) => v !== undefined && v !== null);
  return value;
};

export const listGroupsHandler = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInteger(req.query.limit, 25), 1), 100);
    const offset = Math.max(parseInteger(req.query.offset, 0), 0);

    const groups = await listGroupsService({ limit, offset });

    res.status(200).json({ data: groups, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getGroupHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const group = await getGroupByIdService(id);

    res.status(200).json({ data: group });
  } catch (err) {
    next(err);
  }
};

export const createGroupHandler = async (req, res, next) => {
  try {
    const rawBody = req.body;
    let body = rawBody;
    if (typeof rawBody === 'string') {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    }
    const { description, is_admin_group: isAdminGroupRaw, isAdminGroup: isAdminGroupAlt } = body || {};
    const isAdminGroup = parseBoolean(isAdminGroupRaw ?? isAdminGroupAlt);
    const resolvedName = resolveGroupName(body, req.query, req.headers);

    const group = await createGroupService({
      name: resolvedName,
      description,
      is_admin_group: isAdminGroup
    });

    res.status(201).json({ data: group });
  } catch (err) {
    next(err);
  }
};

export const updateGroupHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const rawBody = req.body;
    let body = rawBody;
    if (typeof rawBody === 'string') {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    }
    const { description, is_admin_group: isAdminGroupRaw, isAdminGroup: isAdminGroupAlt } = body || {};
    const isAdminGroup = parseBoolean(isAdminGroupRaw ?? isAdminGroupAlt);
    const resolvedName = resolveGroupName(body, req.query, req.headers);

    const group = await updateGroupService(id, {
      name: resolvedName,
      description,
      is_admin_group: isAdminGroup
    });

    res.status(200).json({ data: group });
  } catch (err) {
    next(err);
  }
};

export const deleteGroupHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    await deleteGroupService(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const listGroupPermissionsHandler = async (req, res, next) => {
  try {
    const groupId = parseId(req.params.id);
    const permissions = await listGroupPermissionsService(groupId);

    res.status(200).json({ data: permissions });
  } catch (err) {
    next(err);
  }
};

export const replaceGroupPermissionsHandler = async (req, res, next) => {
  try {
    const groupId = parseId(req.params.id);
    const { permissionIds } = req.body || {};
    await replaceGroupPermissionsService(groupId, permissionIds || []);
    const permissions = await listGroupPermissionsService(groupId);
    res.status(200).json({ data: permissions });
  } catch (err) {
    next(err);
  }
};

export const removeGroupPermissionHandler = async (req, res, next) => {
  try {
    // mantenemos handler por compatibilidad, pero respondemos 410 para la API de reemplazo
    res.status(410).json({ error: 'Endpoint deprecado. Usa PUT /api/groups/:id/permissions' });
  } catch (err) {
    next(err);
  }
};

export const listGroupUsersHandler = async (req, res, next) => {
  try {
    const groupId = parseId(req.params.id);
    const users = await listGroupUsersService(groupId);

    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
};

export const addGroupUserHandler = async (req, res, next) => {
  try {
    const groupId = parseId(req.params.id);
    const userId = parseId(req.body?.userId ?? req.body?.user_id);

    const added = await addUserToGroupService(groupId, userId);

    res.status(200).json({ added });
  } catch (err) {
    next(err);
  }
};

export const removeGroupUserHandler = async (req, res, next) => {
  try {
    const groupId = parseId(req.params.id);
    const userId = parseId(req.params.userId);

    const removed = await removeUserFromGroupService(groupId, userId, req.user?.id);

    res.status(200).json({ removed });
  } catch (err) {
    next(err);
  }
};

// alias miembros
export const listGroupMembersHandler = listGroupUsersHandler;
export const addGroupMemberHandler = addGroupUserHandler;
export const removeGroupMemberHandler = removeGroupUserHandler;
