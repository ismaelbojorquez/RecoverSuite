import {
  createDictamen,
  deleteDictamen,
  getDictamenById,
  listDictamenes,
  updateDictamen
} from './dictamenes.repository.js';
import {
  CONTACT_RESULT_TYPES,
  ensureScoreInRange,
  normalizeContactResultType,
  normalizeRiskLevel,
  parseOptionalScore,
  resolveDictamenScores
} from './dictamenes.constants.js';
import { createHttpError } from '../../utils/http-error.js';
import { refreshAffectedClientsForDictamen } from './scoring.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
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

const normalizeText = (value) => String(value || '').trim();

const resolveChannelsInput = (body = {}) =>
  body.canales && typeof body.canales === 'object' && !Array.isArray(body.canales)
    ? body.canales
    : {};

const resolveBodyValue = (body = {}, keys = []) => {
  for (const key of keys) {
    if (body[key] !== undefined) {
      return body[key];
    }
  }

  return undefined;
};

const serializeDictamen = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    score: row.score_global ?? null,
    riesgo: row.nivel_riesgo ?? null,
    tipoContacto: row.tipo_contacto ?? null,
    canales: {
      llamada: row.score_llamada ?? null,
      whatsapp: row.score_whatsapp ?? null,
      sms: row.score_sms ?? null,
      email: row.score_email ?? null,
      visita: row.score_visita ?? null
    },
    permiteContacto:
      row.permitir_contacto === null || row.permitir_contacto === undefined
        ? null
        : Boolean(row.permitir_contacto),
    bloquearCliente:
      row.bloquear_cliente === null || row.bloquear_cliente === undefined
        ? null
        : Boolean(row.bloquear_cliente),
    recomendarReintento:
      row.recomendar_reintento === null || row.recomendar_reintento === undefined
        ? null
        : Boolean(row.recomendar_reintento)
  };
};

const hasPermission = (req, key) =>
  Array.isArray(req.permissions)
    ? req.permissions.includes(key)
    : Array.isArray(req.user?.permissions)
      ? req.user.permissions.includes(key)
      : false;

const resolveCreatePayload = (body = {}) => {
  const channels = resolveChannelsInput(body);
  const portafolioId = parseInteger(body.portafolio_id);
  const nombre = normalizeText(body.nombre);
  const descripcion = normalizeText(body.descripcion) || null;
  const tipoContacto = normalizeContactResultType(
    resolveBodyValue(body, ['tipo_contacto', 'tipoContacto'])
  );
  const scoreGlobal = ensureScoreInRange(
    parseOptionalScore(resolveBodyValue(body, ['score_global', 'score'])),
    'El score global'
  );
  const nivelRiesgo = normalizeRiskLevel(resolveBodyValue(body, ['nivel_riesgo', 'riesgo']));
  const activo = parseBoolean(body.activo);

  if (
    !portafolioId ||
    !nombre ||
    !tipoContacto ||
    scoreGlobal === undefined ||
    scoreGlobal === null ||
    !nivelRiesgo
  ) {
    throw createHttpError(400, 'Datos de dictamen incompletos.');
  }

  const scores = resolveDictamenScores({
    scoreGlobal,
    scoreLlamada: parseOptionalScore(
      channels.llamada !== undefined ? channels.llamada : body.score_llamada
    ),
    scoreWhatsapp: parseOptionalScore(
      channels.whatsapp !== undefined ? channels.whatsapp : body.score_whatsapp
    ),
    scoreSms: parseOptionalScore(channels.sms !== undefined ? channels.sms : body.score_sms),
    scoreEmail: parseOptionalScore(
      channels.email !== undefined ? channels.email : body.score_email
    ),
    scoreVisita: parseOptionalScore(
      channels.visita !== undefined ? channels.visita : body.score_visita
    )
  });

  return {
    portafolioId,
    nombre,
    descripcion,
    tipoContacto,
    ...scores,
    nivelRiesgo,
    permitirContacto:
      parseBoolean(resolveBodyValue(body, ['permitir_contacto', 'permiteContacto'])) ?? true,
    bloquearCliente:
      parseBoolean(resolveBodyValue(body, ['bloquear_cliente', 'bloquearCliente'])) ?? false,
    recomendarReintento:
      parseBoolean(resolveBodyValue(body, ['recomendar_reintento', 'recomendarReintento'])) ??
      false,
    activo: activo ?? true
  };
};

const resolveUpdatePayload = (body = {}, existing) => {
  const channels = resolveChannelsInput(body);
  const payload = {};
  const nombre = body.nombre !== undefined ? normalizeText(body.nombre) : undefined;
  const descripcion =
    body.descripcion !== undefined ? normalizeText(body.descripcion) || null : undefined;
  const tipoContacto =
    resolveBodyValue(body, ['tipo_contacto', 'tipoContacto']) !== undefined
      ? normalizeContactResultType(resolveBodyValue(body, ['tipo_contacto', 'tipoContacto']))
      : undefined;
  const nivelRiesgo =
    resolveBodyValue(body, ['nivel_riesgo', 'riesgo']) !== undefined
      ? normalizeRiskLevel(resolveBodyValue(body, ['nivel_riesgo', 'riesgo']))
      : undefined;

  if (body.nombre !== undefined) {
    if (!nombre) {
      throw createHttpError(400, 'El nombre del dictamen es obligatorio.');
    }
    payload.nombre = nombre;
  }

  if (body.descripcion !== undefined) {
    payload.descripcion = descripcion;
  }

  if (resolveBodyValue(body, ['tipo_contacto', 'tipoContacto']) !== undefined) {
    if (!tipoContacto || !CONTACT_RESULT_TYPES.includes(tipoContacto)) {
      throw createHttpError(400, 'El tipo de contacto es invalido.');
    }
    payload.tipoContacto = tipoContacto;
  }

  if (resolveBodyValue(body, ['nivel_riesgo', 'riesgo']) !== undefined) {
    if (!nivelRiesgo) {
      throw createHttpError(400, 'El nivel de riesgo es invalido.');
    }
    payload.nivelRiesgo = nivelRiesgo;
  }

  const hasScoreGlobal =
    Object.prototype.hasOwnProperty.call(body, 'score_global') ||
    Object.prototype.hasOwnProperty.call(body, 'score');
  const hasScoreLlamada =
    Object.prototype.hasOwnProperty.call(body, 'score_llamada') ||
    Object.prototype.hasOwnProperty.call(channels, 'llamada');
  const hasScoreWhatsapp =
    Object.prototype.hasOwnProperty.call(body, 'score_whatsapp') ||
    Object.prototype.hasOwnProperty.call(channels, 'whatsapp');
  const hasScoreSms =
    Object.prototype.hasOwnProperty.call(body, 'score_sms') ||
    Object.prototype.hasOwnProperty.call(channels, 'sms');
  const hasScoreEmail =
    Object.prototype.hasOwnProperty.call(body, 'score_email') ||
    Object.prototype.hasOwnProperty.call(channels, 'email');
  const hasScoreVisita =
    Object.prototype.hasOwnProperty.call(body, 'score_visita') ||
    Object.prototype.hasOwnProperty.call(channels, 'visita');

  if (
    hasScoreGlobal ||
    hasScoreLlamada ||
    hasScoreWhatsapp ||
    hasScoreSms ||
    hasScoreEmail ||
    hasScoreVisita
  ) {
    const mergedScoreGlobal = hasScoreGlobal
      ? ensureScoreInRange(
          parseOptionalScore(resolveBodyValue(body, ['score_global', 'score'])),
          'El score global'
        )
      : Number.parseFloat(existing.score_global);

    if (!Number.isFinite(mergedScoreGlobal)) {
      throw createHttpError(400, 'El score global es obligatorio.');
    }

    const mergedScores = resolveDictamenScores({
      scoreGlobal: mergedScoreGlobal,
      scoreLlamada: hasScoreLlamada
        ? parseOptionalScore(
            channels.llamada !== undefined ? channels.llamada : body.score_llamada
          )
        : Number.parseFloat(existing.score_llamada),
      scoreWhatsapp: hasScoreWhatsapp
        ? parseOptionalScore(
            channels.whatsapp !== undefined ? channels.whatsapp : body.score_whatsapp
          )
        : Number.parseFloat(existing.score_whatsapp),
      scoreSms: hasScoreSms
        ? parseOptionalScore(channels.sms !== undefined ? channels.sms : body.score_sms)
        : Number.parseFloat(existing.score_sms),
      scoreEmail: hasScoreEmail
        ? parseOptionalScore(channels.email !== undefined ? channels.email : body.score_email)
        : Number.parseFloat(existing.score_email),
      scoreVisita: hasScoreVisita
        ? parseOptionalScore(
            channels.visita !== undefined ? channels.visita : body.score_visita
          )
        : Number.parseFloat(existing.score_visita)
    });

    payload.scoreGlobal = mergedScores.scoreGlobal;
    payload.scoreLlamada = mergedScores.scoreLlamada;
    payload.scoreWhatsapp = mergedScores.scoreWhatsapp;
    payload.scoreSms = mergedScores.scoreSms;
    payload.scoreEmail = mergedScores.scoreEmail;
    payload.scoreVisita = mergedScores.scoreVisita;
  }

  const permitirContacto = parseBoolean(
    resolveBodyValue(body, ['permitir_contacto', 'permiteContacto'])
  );
  if (permitirContacto !== undefined) payload.permitirContacto = permitirContacto;

  const bloquearCliente = parseBoolean(
    resolveBodyValue(body, ['bloquear_cliente', 'bloquearCliente'])
  );
  if (bloquearCliente !== undefined) payload.bloquearCliente = bloquearCliente;

  const recomendarReintento = parseBoolean(
    resolveBodyValue(body, ['recomendar_reintento', 'recomendarReintento'])
  );
  if (recomendarReintento !== undefined) payload.recomendarReintento = recomendarReintento;

  const activo = parseBoolean(body.activo);
  if (activo !== undefined) payload.activo = activo;

  return payload;
};

export const listDictamenesHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.query.portafolio_id);
    if (!portafolioId) {
      throw createHttpError(400, 'portafolio_id es requerido.');
    }

    const isCatalogReader = hasPermission(req, 'dictamenes.read');
    let activo =
      req.query.activo === undefined ? undefined : req.query.activo === 'true' || req.query.activo === true;

    if (!isCatalogReader) {
      activo = true;
    }

    const rows = await listDictamenes({
      portafolioId,
      activo
    });

    res.status(200).json({ data: rows.map(serializeDictamen) });
  } catch (err) {
    next(err);
  }
};

export const getDictamenHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    if (!id) {
      throw createHttpError(400, 'ID invalido.');
    }

    const row = await getDictamenById(id);
    if (!row) {
      throw createHttpError(404, 'Dictamen no encontrado.');
    }

    res.status(200).json({ data: serializeDictamen(row) });
  } catch (err) {
    next(err);
  }
};

export const createDictamenHandler = async (req, res, next) => {
  try {
    const payload = resolveCreatePayload(req.body || {});
    const row = await createDictamen(payload);
    res.status(201).json({ data: serializeDictamen(row) });
  } catch (err) {
    next(err.statusCode ? err : createHttpError(400, err.message || 'No fue posible crear el dictamen.'));
  }
};

export const updateDictamenHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    if (!id) {
      throw createHttpError(400, 'ID invalido.');
    }

    const existing = await getDictamenById(id);
    if (!existing) {
      throw createHttpError(404, 'Dictamen no encontrado.');
    }

    const payload = resolveUpdatePayload(req.body || {}, existing);
    if (Object.keys(payload).length === 0) {
      throw createHttpError(400, 'No se proporcionaron cambios.');
    }

    const row = await updateDictamen(id, payload);
    if (!row) {
      throw createHttpError(404, 'Dictamen no encontrado.');
    }

    setImmediate(() => {
      refreshAffectedClientsForDictamen({ dictamenId: id }).catch((error) => {
        console.error('Client scoring refresh failed', error);
      });
    });

    res.status(200).json({ data: serializeDictamen(row) });
  } catch (err) {
    next(err.statusCode ? err : createHttpError(400, err.message || 'No fue posible actualizar el dictamen.'));
  }
};

export const deleteDictamenHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    if (!id) {
      throw createHttpError(400, 'ID invalido.');
    }

    const row = await deleteDictamen(id);
    if (!row) {
      throw createHttpError(404, 'Dictamen no encontrado.');
    }

    setImmediate(() => {
      refreshAffectedClientsForDictamen({ dictamenId: id }).catch((error) => {
        console.error('Client scoring refresh failed', error);
      });
    });

    res.status(200).json({ data: serializeDictamen(row) });
  } catch (err) {
    next(err.statusCode ? err : createHttpError(400, err.message || 'No fue posible eliminar el dictamen.'));
  }
};
