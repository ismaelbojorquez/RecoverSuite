import { createGestion, listGestiones, listGestionesByCliente } from './gestiones.repository.js';
import { ensureDictamenValido, ensureEntitiesConsistency } from './gestiones.validators.js';
import { createAuditLog } from '../audit/audit.repository.js';
import { getUserPermissions, getUserGroups } from '../permissions/permissions.repository.js';
import { ensureUuid, resolveClientInternalId } from '../clients/client-id.utils.js';
import { normalizeChannel } from '../dictamenes/dictamenes.constants.js';
import { rebuildClientScoringSnapshot } from '../dictamenes/scoring.service.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';
import pool from '../../config/db.js';
import {
  mapDictamenTipoContactoToHistoryResult,
  registrarIntento
} from '../../services/contactHistory.service.js';
import {
  applyStrategyDecisionToClienteScore,
  syncClienteScoreSnapshot
} from '../../services/clienteScore.service.js';
import { calcularSiguienteAccion } from '../../services/strategyEngine.js';
import { actualizarColaConDecision } from '../../services/queueService.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapGestionRow = (row) => {
  if (!row) return row;
  const { cliente_id, cliente_public_id, ...rest } = row;
  return {
    ...rest,
    cliente_id: cliente_public_id,
    cliente_public_id
  };
};

const adminOverridePermissionSet = new Set([
  'admin.full_access',
  'admin_full_access',
  'admin_full_acess'
]);

const hasAdminRole = (roles) =>
  Array.isArray(roles) &&
  roles.some((role) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superuser';
  });

const hasAdminOverridePermission = (permissions) =>
  Array.isArray(permissions) &&
  permissions.some((permission) => adminOverridePermissionSet.has(String(permission || '').trim()));

const resolveRequestPermissions = async (req, userId) => {
  if (Array.isArray(req.user?.permissions)) {
    return req.user.permissions;
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return [];
  }

  const permissions = await getUserPermissions(userId);
  if (req.user) {
    req.user.permissions = permissions;
  }

  return permissions;
};

const resolveRequestGroups = async (req, userId) => {
  if (Array.isArray(req.user?.groups)) {
    return req.user.groups;
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return [];
  }

  const groups = await getUserGroups(userId);
  if (req.user) {
    req.user.groups = groups;
  }

  return groups;
};

const resolveGestionesVisibility = ({ roles, permissions }) => {
  const isAdmin = hasAdminRole(roles) || hasAdminOverridePermission(permissions);

  return {
    canViewAll: isAdmin || permissions.includes('gestiones.view_all'),
    canViewPortfolio: isAdmin || permissions.includes('gestiones.view_portfolio'),
    canViewOwn: isAdmin || permissions.includes('gestiones.view_own')
  };
};

export const createGestionHandler = async (req, res, next) => {
  let dbClient;

  try {
    const {
      portafolio_id,
      cliente_id,
      credito_id,
      dictamen_id,
      medio_contacto,
      comentario,
      fecha_gestion
    } = req.body || {};
    const usuarioId = parseInteger(req.user?.id || req.user?.user_id || req.user?.sub);

    const portafolioId = parseInteger(portafolio_id);
    const clienteId = cliente_id ? ensureUuid(cliente_id, 'cliente_id') : null;
    const creditoId = credito_id === undefined ? null : parseInteger(credito_id);
    const dictamenId = parseInteger(dictamen_id);
    const medioContacto = normalizeChannel(medio_contacto);
    const fechaGestion = parseDate(fecha_gestion);

    if (!portafolioId || !clienteId || !usuarioId || !fechaGestion || !dictamenId || !medioContacto) {
      return res.status(400).json({ error: 'Datos de gestion incompletos.' });
    }

    const comentarioNormalizado = (comentario || '').trim();
    if (!comentarioNormalizado) {
      return res.status(400).json({ error: 'El comentario es obligatorio.' });
    }

    const dictamen = await ensureDictamenValido({
      dictamenId,
      portafolioId
    });

    const resolvedClient = await ensureEntitiesConsistency({
      portafolioId,
      clientePublicId: clienteId,
      creditoId
    });

    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const gestion = await createGestion(
      {
        portafolioId,
        clienteId: resolvedClient.internalId,
        creditoId,
        usuarioId,
        dictamenId,
        medioContacto,
        comentario: comentarioNormalizado,
        fechaGestion
      },
      dbClient
    );

    await dbClient.query('COMMIT');
    dbClient.release();
    dbClient = null;

    const decisionClientId = resolvedClient.client?.id || clienteId;

    await registrarIntento(
      decisionClientId,
      medioContacto,
      mapDictamenTipoContactoToHistoryResult(dictamen?.tipo_contacto),
      dictamenId,
      {
        agenteId: usuarioId,
        fecha: fechaGestion
      }
    );

    const scoringSnapshot = await rebuildClientScoringSnapshot({
      clientInternalId: resolvedClient.internalId,
      portafolioId
    });

    await syncClienteScoreSnapshot(decisionClientId, scoringSnapshot);

    const nextAction = await calcularSiguienteAccion(decisionClientId, {
      now: fechaGestion
    });

    await applyStrategyDecisionToClienteScore(decisionClientId, nextAction, scoringSnapshot);

    const queueUpdate = await actualizarColaConDecision(decisionClientId, nextAction, {
      portafolioId,
      creditoId,
      metadata: {
        gestionId: gestion?.id || null,
        dictamenId,
        medioContacto
      }
    });

    const [userPermissions, userGroups] = await Promise.all([
      resolveRequestPermissions(req, usuarioId),
      resolveRequestGroups(req, usuarioId)
    ]);

    await invalidateClientDetailCache({
      portafolioId,
      clientId: resolvedClient.client?.id || clienteId
    });

    setImmediate(() => {
      createAuditLog({
        usuarioId: usuarioId?.toString() || null,
        accion: 'gestiones.create',
        entidad: 'gestiones',
        entidadId: gestion?.id || null,
        fecha: new Date(),
        ip: req.ip,
        usuarioGrupos: userGroups,
        permisos: userPermissions
      }).catch((err) => {
        console.error('Audit log failed', err);
      });
    });

    res.status(201).json({
      data: {
        gestion: mapGestionRow(gestion),
        client_scoring: scoringSnapshot,
        next_action: nextAction,
        queue_update: {
          queued: Boolean(queueUpdate?.queued),
          queue_id: queueUpdate?.queueItem?._id ?? null
        }
      }
    });
  } catch (err) {
    if (dbClient) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Gestion transaction rollback failed', rollbackError);
      }
      dbClient.release();
    }
    next(err);
  }
};

export const listGestionesHandler = async (req, res, next) => {
  try {
    const {
      portafolio_id,
      cliente_id,
      credito_id,
      fecha_desde,
      fecha_hasta,
      limit,
      offset
    } = req.query || {};

    const userId = parseInteger(req.user?.id);
    const permissions = await resolveRequestPermissions(req, userId);
    const { canViewAll, canViewPortfolio, canViewOwn } = resolveGestionesVisibility({
      roles: req.user?.roles,
      permissions
    });

    if (!canViewAll && !canViewPortfolio && !canViewOwn) {
      return res.status(403).json({ error: 'Sin permiso para ver gestiones.' });
    }

    const portafolioId = parseInteger(portafolio_id);

    let scope = 'own';
    if (canViewAll) {
      scope = 'all';
    } else if (canViewPortfolio) {
      scope = 'portfolio';
    }

    if (scope === 'portfolio' && !portafolioId) {
      return res.status(400).json({ error: 'portafolio_id es requerido.' });
    }

    const resolvedUsuarioId = scope === 'own' ? userId : undefined;

    let resolvedClienteId;
    if (cliente_id) {
      ensureUuid(cliente_id, 'cliente_id');
      const resolved = await resolveClientInternalId({
        publicId: cliente_id,
        portafolioId: scope === 'all' ? portafolioId || undefined : portafolioId
      });
      resolvedClienteId = resolved.internalId;
    }

    const data = await listGestiones({
      portafolioId: scope === 'all' ? portafolioId || undefined : portafolioId,
      clienteId: resolvedClienteId,
      creditoId: parseInteger(credito_id),
      usuarioId: resolvedUsuarioId || undefined,
      fechaDesde: parseDate(fecha_desde),
      fechaHasta: parseDate(fecha_hasta),
      limit: parseInteger(limit) || 20,
      offset: parseInteger(offset) || 0
    });

    setImmediate(() => {
      createAuditLog({
        usuarioId: req.user?.id ? String(req.user.id) : null,
        accion: 'gestiones.read',
        entidad: 'gestiones',
        entidadId: null,
        fecha: new Date(),
        ip: req.ip,
        usuarioGrupos: req.user?.groups,
        permisos: permissions
      }).catch((err) => console.error('Audit log failed', err));
    });

    res.status(200).json({ data: data.map(mapGestionRow) });
  } catch (err) {
    next(err);
  }
};

export const listHistorialClienteHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.query.portafolio_id);
    const clientePublicId = ensureUuid(req.params.clienteId, 'cliente_id');
    const limit = parseInteger(req.query.limit) || 20;
    const offset = parseInteger(req.query.offset) || 0;

    const userId = parseInteger(req.user?.id);
    const permissions = await resolveRequestPermissions(req, userId);
    const { canViewAll, canViewPortfolio, canViewOwn } = resolveGestionesVisibility({
      roles: req.user?.roles,
      permissions
    });

    if (!canViewAll && !canViewPortfolio && !canViewOwn) {
      return res.status(403).json({ error: 'Sin permiso para ver gestiones.' });
    }

    if (!portafolioId || !clientePublicId) {
      return res.status(400).json({ error: 'Portafolio y cliente son requeridos.' });
    }

    const resolvedClient = await resolveClientInternalId({
      publicId: clientePublicId,
      portafolioId
    });

    const scope = canViewAll ? 'all' : canViewPortfolio ? 'portfolio' : 'own';
    const usuarioId = scope === 'own' ? userId : undefined;

    const data = await listGestionesByCliente({
      portafolioId,
      clienteId: resolvedClient.internalId,
      usuarioId,
      limit,
      offset
    });

    setImmediate(() => {
      createAuditLog({
        usuarioId: req.user?.id ? String(req.user.id) : null,
        accion: 'gestiones.read',
        entidad: 'gestiones_historial',
        entidadId: resolvedClient.internalId,
        fecha: new Date(),
        ip: req.ip,
        usuarioGrupos: req.user?.groups,
        permisos: permissions
      }).catch((err) => console.error('Audit log failed', err));
    });

    res.status(200).json({ data: data.map(mapGestionRow), meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
};
