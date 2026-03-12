import { createHttpError } from '../../utils/http-error.js';
import {
  createClientService,
  deleteClientService,
  getClientDetailService,
  getClientByIdService,
  listClientsService,
  updateClientService
} from './clients.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const sanitizeClient = (client) => {
  if (!client) return client;
  const { internal_id, ...rest } = client;
  return rest;
};

const parseUuid = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
};

const parseOptionalPortafolioId = (req) => {
  if (req.query.portafolio_id === undefined) {
    return null;
  }

  const portafolioId = parseInteger(req.query.portafolio_id);
  if (!Number.isInteger(portafolioId) || portafolioId <= 0) {
    throw createHttpError(400, 'portafolio_id invalido');
  }

  return portafolioId;
};

const requirePortafolioId = (req) => {
  const portafolioId = parseInteger(req.query.portafolio_id);

  if (!Number.isInteger(portafolioId) || portafolioId <= 0) {
    throw createHttpError(400, 'portafolio_id es requerido');
  }

  return portafolioId;
};

const requirePagination = (req) => {
  if (req.query.limit === undefined || req.query.offset === undefined) {
    throw createHttpError(400, 'Pagination parameters limit and offset are required');
  }

  const limit = parseInteger(req.query.limit);
  const offset = parseInteger(req.query.offset);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError(400, 'Invalid limit');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'Invalid offset');
  }

  return {
    limit: Math.min(limit, 100),
    offset
  };
};

export const listClientsHandler = async (req, res, next) => {
  try {
    const { limit, offset } = requirePagination(req);
    const portafolioId = requirePortafolioId(req);
    const query = req.query.q;

    const clients = await listClientsService({
      portafolioId,
      limit,
      offset,
      query
    });

    res.status(200).json({ data: clients, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getClientHandler = async (req, res, next) => {
  try {
    const id = parseUuid(req.params.id);
    if (!id) {
      throw createHttpError(400, 'client id invalido');
    }
    const portafolioId = parseOptionalPortafolioId(req);
    const client = await getClientByIdService({ id, portafolioId });

    res.status(200).json({ data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
};

export const createClientHandler = async (req, res, next) => {
  try {
    const {
      portafolio_id: portafolioIdRaw,
      numero_cliente: numeroCliente,
      nombre,
      nombre_completo: nombreCompleto,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      rfc,
      curp
    } = req.body || {};

    const portafolioId = parseInteger(portafolioIdRaw);

    const client = await createClientService({
      portafolioId,
      numeroCliente,
      nombre,
      nombreCompleto,
      apellidoPaterno,
      apellidoMaterno,
      rfc,
      curp
    });

    res.status(201).json({ data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
};

export const updateClientHandler = async (req, res, next) => {
  try {
    const id = parseUuid(req.params.id);
    if (!id) {
      throw createHttpError(400, 'client id invalido');
    }
    const {
      portafolio_id: portafolioIdRaw,
      numero_cliente: numeroCliente,
      nombre,
      nombre_completo: nombreCompleto,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      rfc,
      curp
    } = req.body || {};

    const portafolioId =
      portafolioIdRaw !== undefined ? parseInteger(portafolioIdRaw) : undefined;

    const client = await updateClientService(id, {
      portafolioId,
      numeroCliente,
      nombre,
      nombreCompleto,
      apellidoPaterno,
      apellidoMaterno,
      rfc,
      curp
    });

    res.status(200).json({ data: sanitizeClient(client) });
  } catch (err) {
    next(err);
  }
};

export const deleteClientHandler = async (req, res, next) => {
  try {
    const id = parseUuid(req.params.id);
    if (!id) {
      throw createHttpError(400, 'client id invalido');
    }

    await deleteClientService(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getClientDetailHandler = async (req, res, next) => {
  try {
    const clientId = parseUuid(req.params.id);
    if (!clientId) {
      throw createHttpError(400, 'client id invalido');
    }
    const portafolioId = parseOptionalPortafolioId(req);

    const detail = await getClientDetailService({ clientId, portafolioId });

    res.status(200).json({ data: detail });
  } catch (err) {
    next(err);
  }
};
