import mongoose from 'mongoose';
import LayoutConfig from '../models/LayoutConfig.js';
import { connectMongo, isMongoConfigured } from '../config/mongo.js';
import { getUserGroups } from '../modules/permissions/permissions.repository.js';
import { createHttpError } from '../utils/http-error.js';

const normalizePage = (value) => String(value || '').trim();

const normalizeRole = (value) => String(value || '').trim().toLowerCase();

const normalizeUserRef = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const normalizeGroup = (value) => String(value || '').trim().toLowerCase();

const normalizeScope = (value) => {
  const normalized = String(value || 'global')
    .trim()
    .toLowerCase();

  if (!normalized || normalized === 'global') {
    return 'global';
  }

  if (normalized === 'group' || normalized === 'grupo') {
    return 'group';
  }

  if (normalized === 'user' || normalized === 'usuario') {
    return 'user';
  }

  throw createHttpError(400, 'scope invalido. Usa global, group o user.');
};

const hasAdminRole = (roles) =>
  Array.isArray(roles) &&
  roles.some((role) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superuser';
  });

const resolveBaseRole = (roles) => {
  if (hasAdminRole(roles)) {
    return 'admin';
  }

  const firstRole = Array.isArray(roles) ? roles[0] : null;
  const normalizedFirstRole = normalizeRole(firstRole);
  return normalizedFirstRole || 'user';
};

const resolveReadRole = (req, requestedRole) => {
  const fallbackRole = resolveBaseRole(req.user?.roles);
  const normalizedRequested = normalizeRole(requestedRole);

  if (!normalizedRequested) {
    return fallbackRole;
  }

  if (hasAdminRole(req.user?.roles)) {
    return normalizedRequested;
  }

  return normalizedRequested === fallbackRole ? normalizedRequested : fallbackRole;
};

let layoutIndexesEnsured = false;

const ensureLayoutIndexes = async () => {
  if (layoutIndexesEnsured) {
    return;
  }

  await LayoutConfig.syncIndexes();
  layoutIndexesEnsured = true;
};

const ensureMongoReady = async () => {
  if (!isMongoConfigured()) {
    throw createHttpError(503, 'MongoDB no configurado para layouts. Define MONGO_URI.');
  }

  try {
    await connectMongo();
    await ensureLayoutIndexes();
  } catch (err) {
    throw createHttpError(503, `No fue posible conectar con MongoDB: ${err.message}`);
  }
};

const ensureAdminUser = (req) => {
  if (!hasAdminRole(req.user?.roles)) {
    throw createHttpError(403, 'Solo administradores pueden guardar layouts globales o por grupo.');
  }
};

const sanitizeLayoutDocument = (document) => {
  if (!document) {
    return null;
  }

  if (typeof document.toObject === 'function') {
    return document.toObject();
  }

  return document;
};

const resolveOptionalObjectId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (!mongoose.isValidObjectId(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeGroupEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => {
      if (typeof entry === 'string') {
        return normalizeGroup(entry);
      }

      if (entry && typeof entry === 'object') {
        return normalizeGroup(entry.name || entry.nombre || entry.group || entry.grupo || entry.id);
      }

      return '';
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const resolveGroupsFromRequest = async (req) => {
  const requestGroups = normalizeGroupEntries(req.user?.grupos || req.user?.groups);
  if (requestGroups.length > 0) {
    return requestGroups;
  }

  const parsedUserId = Number.parseInt(req.user?.id, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return [];
  }

  try {
    const dbGroups = await getUserGroups(parsedUserId);
    return normalizeGroupEntries(dbGroups);
  } catch {
    return [];
  }
};

const resolveReadGroups = async (req, requestedGroup) => {
  const availableGroups = await resolveGroupsFromRequest(req);
  const normalizedRequestedGroup = normalizeGroup(requestedGroup);

  if (!normalizedRequestedGroup) {
    return availableGroups;
  }

  if (hasAdminRole(req.user?.roles)) {
    return [normalizedRequestedGroup, ...availableGroups.filter((group) => group !== normalizedRequestedGroup)];
  }

  if (availableGroups.includes(normalizedRequestedGroup)) {
    return [normalizedRequestedGroup, ...availableGroups.filter((group) => group !== normalizedRequestedGroup)];
  }

  return availableGroups;
};

const resolveRequestUserRef = (req) =>
  normalizeUserRef(req.user?.id || req.user?.user_id || req.user?.sub);

const resolveFallbackPayload = ({ page, role, userRef, groups }) => ({
  page,
  role,
  userRef: userRef || null,
  groupKey: Array.isArray(groups) && groups.length > 0 ? groups[0] : null,
  userId: null,
  layout: [],
  createdAt: null,
  updatedAt: null
});

export const getLayout = async (page, role, options = {}) => {
  const normalizedPage = normalizePage(page);
  if (!normalizedPage) {
    throw createHttpError(400, 'page es requerido');
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw createHttpError(400, 'role es requerido');
  }

  const userRef = normalizeUserRef(options.userRef);
  const groupKeys = normalizeGroupEntries(options.groups);
  const legacyUserObjectId =
    resolveOptionalObjectId(options.userId) || resolveOptionalObjectId(userRef);

  if (userRef) {
    const userLayout = await LayoutConfig.findOne({
      page: normalizedPage,
      role: normalizedRole,
      userRef
    }).sort({ updatedAt: -1 });

    if (userLayout) {
      return sanitizeLayoutDocument(userLayout);
    }
  }

  if (legacyUserObjectId) {
    const legacyUserLayout = await LayoutConfig.findOne({
      page: normalizedPage,
      role: normalizedRole,
      userId: legacyUserObjectId
    }).sort({ updatedAt: -1 });

    if (legacyUserLayout) {
      return sanitizeLayoutDocument(legacyUserLayout);
    }
  }

  for (const groupKey of groupKeys) {
    const groupLayout = await LayoutConfig.findOne({
      page: normalizedPage,
      role: normalizedRole,
      groupKey,
      userRef: null,
      userId: null
    }).sort({ updatedAt: -1 });

    if (groupLayout) {
      return sanitizeLayoutDocument(groupLayout);
    }
  }

  const globalLayout = await LayoutConfig.findOne({
    page: normalizedPage,
    role: normalizedRole,
    groupKey: null,
    userRef: null,
    userId: null
  }).sort({ updatedAt: -1 });

  if (globalLayout) {
    return sanitizeLayoutDocument(globalLayout);
  }

  return resolveFallbackPayload({
    page: normalizedPage,
    role: normalizedRole,
    userRef,
    groups: groupKeys
  });
};

export const saveLayout = async (page, role, layout, options = {}) => {
  const normalizedPage = normalizePage(page);
  if (!normalizedPage) {
    throw createHttpError(400, 'page es requerido');
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw createHttpError(400, 'role es requerido');
  }

  if (!Array.isArray(layout)) {
    throw createHttpError(400, 'layout debe ser un arreglo');
  }

  const scope = normalizeScope(options.scope || 'global');
  const groupKey = normalizeGroup(options.groupKey || options.group || options.grupo);
  const rawUserRef = normalizeUserRef(options.userRef || options.user_id || options.userId);
  const legacyUserObjectId = resolveOptionalObjectId(options.userId);
  const userRef = rawUserRef || (legacyUserObjectId ? String(legacyUserObjectId) : '');

  const nextDocument = {
    page: normalizedPage,
    role: normalizedRole,
    groupKey: null,
    userRef: null,
    userId: null,
    layout
  };

  if (scope === 'group') {
    if (!groupKey) {
      throw createHttpError(400, 'group es requerido para guardar layout por grupo');
    }

    nextDocument.groupKey = groupKey;
  }

  if (scope === 'user') {
    if (!userRef) {
      throw createHttpError(400, 'userId es requerido para guardar layout por usuario');
    }

    nextDocument.userRef = userRef;
    nextDocument.userId = null;
  }

  const updated = await LayoutConfig.findOneAndUpdate(
    {
      page: normalizedPage,
      role: normalizedRole,
      groupKey: nextDocument.groupKey,
      userRef: nextDocument.userRef,
      userId: nextDocument.userId
    },
    {
      $set: nextDocument
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return sanitizeLayoutDocument(updated);
};

export const getLayoutHandler = async (req, res, next) => {
  try {
    await ensureMongoReady();

    const page = req.query.page;
    const requestedRole = req.query.role;
    const requestedGroup = req.query.group || req.query.grupo;

    const effectiveRole = resolveReadRole(req, requestedRole);
    const effectiveUserRef = resolveRequestUserRef(req);
    const effectiveGroups = await resolveReadGroups(req, requestedGroup);

    const document = await getLayout(page, effectiveRole, {
      userRef: effectiveUserRef,
      userId: effectiveUserRef,
      groups: effectiveGroups
    });

    res.status(200).json({ data: document });
  } catch (err) {
    next(err);
  }
};

export const saveLayoutHandler = async (req, res, next) => {
  try {
    await ensureMongoReady();

    const { page, role, layout, scope, group, grupo, userId } = req.body || {};
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      throw createHttpError(400, 'role es requerido para guardar layout');
    }

    const normalizedScope = normalizeScope(scope || 'global');

    if (normalizedScope === 'global' || normalizedScope === 'group') {
      ensureAdminUser(req);
    }

    const targetGroup = normalizeGroup(group || grupo);
    const isAdminUser = hasAdminRole(req.user?.roles);
    const actorUserRef = resolveRequestUserRef(req);
    const targetUserRef =
      normalizedScope === 'user'
        ? normalizeUserRef(isAdminUser && userId ? userId : actorUserRef)
        : '';

    if (normalizedScope === 'group' && !targetGroup) {
      throw createHttpError(400, 'group es requerido para guardar layout por grupo');
    }

    if (normalizedScope === 'user' && !targetUserRef) {
      throw createHttpError(400, 'No se pudo resolver userId para guardar layout por usuario');
    }

    const document = await saveLayout(page, normalizedRole, layout, {
      scope: normalizedScope,
      groupKey: normalizedScope === 'group' ? targetGroup : null,
      userRef: normalizedScope === 'user' ? targetUserRef : null,
      userId: normalizedScope === 'user' ? targetUserRef : null
    });

    res.status(200).json({ data: document });
  } catch (err) {
    next(err);
  }
};
