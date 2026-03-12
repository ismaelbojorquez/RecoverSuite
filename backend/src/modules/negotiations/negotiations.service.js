import pool from '../../config/db.js';
import { createHttpError } from '../../utils/http-error.js';
import { ensureUuid, resolveClientInternalId } from '../clients/client-id.utils.js';
import {
  createDiscountLevel,
  createNegotiation,
  createNegotiationEvent,
  findActiveNegotiationByClient,
  getDiscountLevelById,
  getDiscountLevelByIdForUser,
  getNegotiationById,
  insertNegotiationCredits,
  listAvailableDiscountLevelsForUser,
  listClientCreditsForNegotiation,
  listDiscountLevels,
  listNegotiationsByClient,
  setDiscountLevelGroups,
  updateDiscountLevel,
  updateNegotiationStatus
} from './negotiations.repository.js';

const VALID_NEGOTIATION_STATUS = new Set(['activa', 'cerrada', 'cancelada']);

const normalizeText = (value) => String(value ?? '').trim();

const parsePositiveInteger = (value, label) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${label} invalido`);
  }
  return parsed;
};

const parseOptionalCurrency = (value, label) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createHttpError(400, `${label} invalido`);
  }

  return roundCurrency(parsed);
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const roundCurrency = (value) => Math.round(value * 100) / 100;

const ensureNegotiationStatus = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!VALID_NEGOTIATION_STATUS.has(normalized)) {
    throw createHttpError(400, 'Estado de negociacion invalido');
  }
  return normalized;
};

const normalizeCreditIds = (value) => {
  if (!Array.isArray(value)) {
    throw createHttpError(400, 'credito_ids debe ser un arreglo');
  }

  const parsed = value.map((item) => parsePositiveInteger(item, 'credito_id'));
  const unique = Array.from(new Set(parsed));

  if (unique.length === 0) {
    throw createHttpError(400, 'Debes seleccionar al menos un credito');
  }

  return unique;
};

const mapCreditsToPublic = (credits) =>
  (Array.isArray(credits) ? credits : []).map((credit) => ({
    credito_id: Number(credit?.credito_id ?? credit?.creditoId ?? credit?.id),
    numero_credito: credit?.numero_credito || null,
    numero_credito_externo: credit?.numero_credito_externo || null,
    producto: credit?.producto || null,
    monto_base:
      credit?.monto_base !== undefined && credit?.monto_base !== null
        ? roundCurrency(toNumber(credit.monto_base))
        : null,
    monto_negociado:
      credit?.monto_negociado !== undefined && credit?.monto_negociado !== null
        ? roundCurrency(toNumber(credit.monto_negociado))
        : null
  }));

const mapNegotiationToPublic = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    cliente_id: row.client_public_id,
    portafolio_id: row.portfolio_id,
    nivel_descuento_id: row.discount_level_id,
    nivel_descuento_nombre: row.nivel_nombre,
    nivel_descuento_porcentaje: roundCurrency(toNumber(row.nivel_porcentaje_descuento, row.porcentaje_descuento)),
    usuario_id: row.usuario_id,
    usuario_username: row.usuario_username || null,
    usuario_nombre: row.usuario_nombre || null,
    estado: row.estado,
    referencia: row.referencia || null,
    observaciones: row.observaciones || null,
    fecha_inicio: row.fecha_inicio,
    fecha_cierre: row.fecha_cierre || null,
    monto_base_total:
      row.monto_base_total !== undefined && row.monto_base_total !== null
        ? roundCurrency(toNumber(row.monto_base_total))
        : null,
    monto_negociado_total:
      row.monto_negociado_total !== undefined && row.monto_negociado_total !== null
        ? roundCurrency(toNumber(row.monto_negociado_total))
        : null,
    monto_descuento_total:
      row.monto_descuento_total !== undefined && row.monto_descuento_total !== null
        ? roundCurrency(toNumber(row.monto_descuento_total))
        : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creditos: mapCreditsToPublic(row.creditos)
  };
};

const resolveNegotiatedAmountByCredits = ({
  credits,
  totalBaseAmount,
  totalNegotiatedAmount
}) => {
  if (!Array.isArray(credits) || credits.length === 0 || totalBaseAmount <= 0) {
    return credits.map((credit) => ({
      ...credit,
      monto_negociado: null
    }));
  }

  let remaining = roundCurrency(totalNegotiatedAmount);

  return credits.map((credit, index) => {
    const base = roundCurrency(toNumber(credit.monto_base, 0));
    if (index === credits.length - 1) {
      const lastValue = roundCurrency(Math.max(remaining, 0));
      return {
        ...credit,
        monto_negociado: lastValue
      };
    }

    const proportional = totalBaseAmount > 0 ? roundCurrency((base / totalBaseAmount) * totalNegotiatedAmount) : 0;
    remaining = roundCurrency(remaining - proportional);
    return {
      ...credit,
      monto_negociado: proportional
    };
  });
};

const ensureGroupIdsExist = async (groupIds, db = pool) => {
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return;
  }

  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM user_groups
     WHERE id = ANY($1::BIGINT[])`,
    [groupIds]
  );

  const total = Number(result.rows[0]?.count || 0);
  if (total !== groupIds.length) {
    throw createHttpError(400, 'Hay grupos invalidos en la asignacion');
  }
};

const ensureNoActiveNegotiationsForDiscountLevel = async (discountLevelId, db = pool) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count
     FROM negotiations
     WHERE discount_level_id = $1
       AND estado = 'activa'`,
    [discountLevelId]
  );

  const activeCount = Number(result.rows[0]?.count || 0);
  if (activeCount > 0) {
    throw createHttpError(
      409,
      'No se puede desactivar este nivel porque tiene negociaciones activas'
    );
  }
};

const assertNegotiationAmounts = ({ montoBaseTotal, montoNegociadoTotal }) => {
  if (
    montoBaseTotal !== null &&
    montoNegociadoTotal !== null &&
    montoNegociadoTotal > montoBaseTotal
  ) {
    throw createHttpError(400, 'El monto negociado no puede ser mayor al monto base');
  }
};

export const listDiscountLevelsService = async ({ includeInactive = false } = {}) => {
  return listDiscountLevels({ includeInactive });
};

export const listAvailableDiscountLevelsForUserService = async ({ userId, isAdmin = false }) => {
  parsePositiveInteger(userId, 'usuario');
  return listAvailableDiscountLevelsForUser({ userId, isAdmin });
};

export const createDiscountLevelService = async ({
  nombre,
  descripcion,
  porcentaje_descuento: porcentajeDescuentoRaw,
  activo
}) => {
  const nombreNormalizado = normalizeText(nombre);
  if (!nombreNormalizado) {
    throw createHttpError(400, 'El nombre del nivel es requerido');
  }

  const porcentajeDescuento = parseOptionalCurrency(
    porcentajeDescuentoRaw,
    'porcentaje_descuento'
  );

  if (porcentajeDescuento === null || porcentajeDescuento > 100) {
    throw createHttpError(400, 'porcentaje_descuento debe estar entre 0 y 100');
  }

  try {
    return await createDiscountLevel({
      nombre: nombreNormalizado,
      descripcion: normalizeText(descripcion) || null,
      porcentajeDescuento,
      activo: activo === undefined ? true : Boolean(activo)
    });
  } catch (err) {
    if (err?.code === '23505') {
      throw createHttpError(409, 'Ya existe un nivel de descuento con ese nombre');
    }
    throw err;
  }
};

export const updateDiscountLevelService = async (id, updates = {}) => {
  const discountLevelId = parsePositiveInteger(id, 'nivel_descuento');
  const payload = {};

  if (updates.nombre !== undefined) {
    const normalized = normalizeText(updates.nombre);
    if (!normalized) {
      throw createHttpError(400, 'El nombre del nivel es requerido');
    }
    payload.nombre = normalized;
  }

  if (updates.descripcion !== undefined) {
    payload.descripcion = normalizeText(updates.descripcion) || null;
  }

  if (updates.porcentaje_descuento !== undefined) {
    const porcentajeDescuento = parseOptionalCurrency(
      updates.porcentaje_descuento,
      'porcentaje_descuento'
    );
    if (porcentajeDescuento === null || porcentajeDescuento > 100) {
      throw createHttpError(400, 'porcentaje_descuento debe estar entre 0 y 100');
    }
    payload.porcentajeDescuento = porcentajeDescuento;
  }

  if (updates.activo !== undefined) {
    payload.activo = Boolean(updates.activo);
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No se enviaron cambios para actualizar');
  }

  if (payload.activo === false) {
    await ensureNoActiveNegotiationsForDiscountLevel(discountLevelId);
  }

  try {
    const updated = await updateDiscountLevel(discountLevelId, payload);
    if (!updated) {
      throw createHttpError(404, 'Nivel de descuento no encontrado');
    }
    return updated;
  } catch (err) {
    if (err?.code === '23505') {
      throw createHttpError(409, 'Ya existe un nivel de descuento con ese nombre');
    }
    throw err;
  }
};

export const setDiscountLevelGroupsService = async ({ discountLevelId, groupIds = [] }) => {
  const levelId = parsePositiveInteger(discountLevelId, 'nivel_descuento');
  const normalizedGroupIds = Array.from(
    new Set((Array.isArray(groupIds) ? groupIds : []).map((item) => parsePositiveInteger(item, 'grupo')))
  );

  const level = await getDiscountLevelById(levelId);
  if (!level) {
    throw createHttpError(404, 'Nivel de descuento no encontrado');
  }

  await ensureGroupIdsExist(normalizedGroupIds);
  await setDiscountLevelGroups({
    discountLevelId: levelId,
    groupIds: normalizedGroupIds
  });

  return true;
};

export const createNegotiationService = async ({
  portafolioId,
  clienteId,
  nivelDescuentoId,
  creditoIds,
  referencia,
  observaciones,
  montoBaseTotal,
  montoNegociadoTotal,
  usuarioId,
  isAdmin = false
}) => {
  const userId = parsePositiveInteger(usuarioId, 'usuario');
  const portfolioId = parsePositiveInteger(portafolioId, 'portafolio');
  const clientPublicId = ensureUuid(clienteId, 'cliente');
  const discountLevelId = parsePositiveInteger(nivelDescuentoId, 'nivel_descuento');
  const selectedCreditIds = normalizeCreditIds(creditoIds);
  const referenciaNormalizada = normalizeText(referencia) || null;
  const observacionesNormalizadas = normalizeText(observaciones) || null;
  const requestedBaseAmount = parseOptionalCurrency(montoBaseTotal, 'monto_base_total');
  const requestedNegotiatedAmount = parseOptionalCurrency(
    montoNegociadoTotal,
    'monto_negociado_total'
  );

  const resolvedClient = await resolveClientInternalId({
    publicId: clientPublicId,
    portafolioId: portfolioId
  });

  const availableLevel = await getDiscountLevelByIdForUser({
    discountLevelId,
    userId,
    isAdmin
  });

  if (!availableLevel) {
    throw createHttpError(403, 'No tienes permisos para usar ese nivel de descuento');
  }

  const percentage = roundCurrency(toNumber(availableLevel.porcentaje_descuento, 0));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const alreadyActive = await findActiveNegotiationByClient(
      { clientId: resolvedClient.internalId, forUpdate: true },
      client
    );
    if (alreadyActive) {
      throw createHttpError(
        409,
        'El cliente ya tiene una negociacion activa. Debes cerrarla o cancelarla antes de crear otra.'
      );
    }

    const credits = await listClientCreditsForNegotiation(
      {
        clientId: resolvedClient.internalId,
        portfolioId: portfolioId,
        creditIds: selectedCreditIds
      },
      client
    );

    if (credits.length !== selectedCreditIds.length) {
      throw createHttpError(
        400,
        'Uno o mas creditos no pertenecen al cliente o al portafolio seleccionado'
      );
    }

    const baseFromCredits = roundCurrency(
      credits.reduce((sum, credit) => sum + toNumber(credit.monto_base, 0), 0)
    );
    const resolvedBaseAmount = requestedBaseAmount !== null ? requestedBaseAmount : baseFromCredits;

    const computedNegotiatedAmount =
      requestedNegotiatedAmount !== null
        ? requestedNegotiatedAmount
        : roundCurrency(resolvedBaseAmount * (1 - percentage / 100));

    assertNegotiationAmounts({
      montoBaseTotal: resolvedBaseAmount,
      montoNegociadoTotal: computedNegotiatedAmount
    });

    const discountAmount =
      resolvedBaseAmount !== null && computedNegotiatedAmount !== null
        ? roundCurrency(Math.max(resolvedBaseAmount - computedNegotiatedAmount, 0))
        : null;

    const negotiationInserted = await createNegotiation(
      {
        clientId: resolvedClient.internalId,
        portfolioId,
        discountLevelId,
        usuarioId: userId,
        referencia: referenciaNormalizada,
        observaciones: observacionesNormalizadas,
        porcentajeDescuento: percentage,
        montoBaseTotal: resolvedBaseAmount,
        montoNegociadoTotal: computedNegotiatedAmount,
        montoDescuentoTotal: discountAmount
      },
      client
    );

    if (!negotiationInserted?.id) {
      throw createHttpError(500, 'No fue posible crear la negociacion');
    }

    const creditsWithNegotiatedAmount = resolveNegotiatedAmountByCredits({
      credits,
      totalBaseAmount: resolvedBaseAmount,
      totalNegotiatedAmount: computedNegotiatedAmount
    });

    await insertNegotiationCredits(
      {
        negotiationId: negotiationInserted.id,
        credits: creditsWithNegotiatedAmount
      },
      client
    );

    await createNegotiationEvent(
      {
        negotiationId: negotiationInserted.id,
        tipo: 'creada',
        detalle: 'Negociacion creada',
        payload: {
          nivel_descuento_id: discountLevelId,
          porcentaje_descuento: percentage,
          credito_ids: selectedCreditIds
        },
        usuarioId: userId
      },
      client
    );

    const negotiation = await getNegotiationById(negotiationInserted.id, client);

    await client.query('COMMIT');
    return mapNegotiationToPublic(negotiation);
  } catch (err) {
    await client.query('ROLLBACK');

    if (
      err?.code === '23505' &&
      String(err?.constraint || '').includes('uq_negotiations_active_client')
    ) {
      throw createHttpError(
        409,
        'El cliente ya tiene una negociacion activa. Debes cerrarla o cancelarla antes de crear otra.'
      );
    }

    throw err;
  } finally {
    client.release();
  }
};

export const updateNegotiationStatusService = async ({
  negotiationId,
  estado,
  observaciones,
  montoNegociadoTotal,
  usuarioId
}) => {
  const resolvedNegotiationId = parsePositiveInteger(negotiationId, 'negociacion');
  const resolvedEstado = ensureNegotiationStatus(estado);
  if (resolvedEstado === 'activa') {
    throw createHttpError(400, 'No se permite regresar una negociacion al estado activa');
  }

  const userId = parsePositiveInteger(usuarioId, 'usuario');
  const observacionesNormalizadas = normalizeText(observaciones) || null;
  const requestedNegotiatedAmount = parseOptionalCurrency(
    montoNegociadoTotal,
    'monto_negociado_total'
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await getNegotiationById(resolvedNegotiationId, client);
    if (!existing) {
      throw createHttpError(404, 'Negociacion no encontrada');
    }

    if (existing.estado !== 'activa') {
      throw createHttpError(409, 'La negociacion ya no esta activa');
    }

    let montoNegociadoFinal = existing.monto_negociado_total;
    if (resolvedEstado === 'cerrada') {
      montoNegociadoFinal =
        requestedNegotiatedAmount !== null
          ? requestedNegotiatedAmount
          : existing.monto_negociado_total !== null
            ? roundCurrency(toNumber(existing.monto_negociado_total))
            : null;
    }

    const montoBaseTotal =
      existing.monto_base_total !== null
        ? roundCurrency(toNumber(existing.monto_base_total))
        : null;

    assertNegotiationAmounts({
      montoBaseTotal,
      montoNegociadoTotal: montoNegociadoFinal
    });

    const montoDescuentoTotal =
      montoBaseTotal !== null && montoNegociadoFinal !== null
        ? roundCurrency(Math.max(montoBaseTotal - montoNegociadoFinal, 0))
        : existing.monto_descuento_total !== null
          ? roundCurrency(toNumber(existing.monto_descuento_total))
          : null;

    const updated = await updateNegotiationStatus(
      {
        negotiationId: resolvedNegotiationId,
        estado: resolvedEstado,
        observaciones: observacionesNormalizadas,
        montoNegociadoTotal: montoNegociadoFinal,
        montoDescuentoTotal
      },
      client
    );

    if (!updated) {
      throw createHttpError(409, 'No fue posible actualizar la negociacion');
    }

    await createNegotiationEvent(
      {
        negotiationId: resolvedNegotiationId,
        tipo: resolvedEstado === 'cerrada' ? 'cerrada' : 'cancelada',
        detalle:
          resolvedEstado === 'cerrada'
            ? 'Negociacion cerrada'
            : 'Negociacion cancelada',
        payload: {
          estado: resolvedEstado,
          monto_negociado_total: montoNegociadoFinal,
          monto_descuento_total: montoDescuentoTotal
        },
        usuarioId: userId
      },
      client
    );

    const negotiation = await getNegotiationById(resolvedNegotiationId, client);

    await client.query('COMMIT');
    return mapNegotiationToPublic(negotiation);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listClientNegotiationsService = async ({
  clienteId,
  portafolioId,
  limit = 20,
  offset = 0
}) => {
  const clientPublicId = ensureUuid(clienteId, 'cliente');
  const portfolioId = parsePositiveInteger(portafolioId, 'portafolio');
  const resolvedLimit = Math.max(1, Math.min(parsePositiveInteger(limit, 'limit'), 100));
  const resolvedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

  const resolvedClient = await resolveClientInternalId({
    publicId: clientPublicId,
    portafolioId: portfolioId
  });

  const rows = await listNegotiationsByClient({
    clientId: resolvedClient.internalId,
    limit: resolvedLimit,
    offset: resolvedOffset
  });

  const data = rows.map(mapNegotiationToPublic);
  const active = data.find((item) => item.estado === 'activa') || null;
  const history = data.filter((item) => item.estado !== 'activa');

  return {
    active,
    history,
    data,
    meta: {
      limit: resolvedLimit,
      offset: resolvedOffset
    }
  };
};

