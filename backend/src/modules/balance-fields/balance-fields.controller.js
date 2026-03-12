import { createHttpError } from '../../utils/http-error.js';
import {
  createBalanceFieldService,
  deleteBalanceFieldService,
  getBalanceFieldService,
  listBalanceFieldsService,
  updateBalanceFieldService
} from './balance-fields.service.js';

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

const parsePagination = (req) => {
  if (req.query.limit === undefined && req.query.offset === undefined) {
    return null;
  }

  const limit = parseInteger(req.query.limit);
  const offset = parseInteger(req.query.offset ?? 0);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return { limit: Math.min(limit, 100), offset };
};

export const listBalanceFieldsHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.params.portafolioId);
    const pagination = parsePagination(req);

    const fields = await listBalanceFieldsService({
      portafolioId,
      limit: pagination?.limit,
      offset: pagination?.offset
    });

    res.status(200).json({
      data: fields,
      ...(pagination ? pagination : {})
    });
  } catch (err) {
    next(err);
  }
};

export const getBalanceFieldHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.params.portafolioId);
    const fieldId = parseInteger(req.params.fieldId);

    const field = await getBalanceFieldService({ portafolioId, fieldId });

    res.status(200).json({ data: field });
  } catch (err) {
    next(err);
  }
};

export const createBalanceFieldHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.params.portafolioId);
    const {
      nombre_campo: nombreCampo,
      etiqueta_visual: etiquetaVisual,
      tipo_dato: tipoDato,
      orden,
      es_principal: esPrincipalRaw,
      activo: activoRaw
    } = req.body || {};

    const esPrincipal = parseBoolean(esPrincipalRaw);
    const activo = parseBoolean(activoRaw);

    const field = await createBalanceFieldService({
      portafolioId,
      nombreCampo,
      etiquetaVisual,
      tipoDato,
      orden,
      esPrincipal,
      activo
    });

    res.status(201).json({ data: field });
  } catch (err) {
    next(err);
  }
};

export const updateBalanceFieldHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.params.portafolioId);
    const fieldId = parseInteger(req.params.fieldId);
    const {
      nombre_campo: nombreCampo,
      etiqueta_visual: etiquetaVisual,
      tipo_dato: tipoDato,
      orden,
      es_principal: esPrincipalRaw,
      activo: activoRaw
    } = req.body || {};

    const esPrincipal = parseBoolean(esPrincipalRaw);
    const activo = parseBoolean(activoRaw);

    const field = await updateBalanceFieldService({
      portafolioId,
      fieldId,
      nombreCampo,
      etiquetaVisual,
      tipoDato,
      orden,
      esPrincipal,
      activo
    });

    res.status(200).json({ data: field });
  } catch (err) {
    next(err);
  }
};

export const deleteBalanceFieldHandler = async (req, res, next) => {
  try {
    const portafolioId = parseInteger(req.params.portafolioId);
    const fieldId = parseInteger(req.params.fieldId);

    await deleteBalanceFieldService({ portafolioId, fieldId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
