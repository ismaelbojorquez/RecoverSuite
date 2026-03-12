import { createHttpError } from '../../utils/http-error.js';
import {
  createAddressService,
  deleteAddressService,
  getAddressService,
  listAddressesService,
  updateAddressService
} from './addresses.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
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

  return { limit, offset };
};

export const listAddressesHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const pagination = parsePagination(req);

    const addresses = await listAddressesService({
      clientId,
      limit: pagination?.limit,
      offset: pagination?.offset
    });

    res.status(200).json({
      data: addresses,
      ...(pagination ? pagination : {})
    });
  } catch (err) {
    next(err);
  }
};

export const getAddressHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const addressId = parseInteger(req.params.addressId);

    const address = await getAddressService({ clientId, addressId });

    res.status(200).json({ data: address });
  } catch (err) {
    next(err);
  }
};

export const createAddressHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const {
      linea1,
      linea2,
      ciudad,
      estado,
      codigo_postal: codigoPostal,
      pais
    } = req.body || {};

    const address = await createAddressService({
      clientId,
      linea1,
      linea2,
      ciudad,
      estado,
      codigoPostal,
      pais
    });

    res.status(201).json({ data: address });
  } catch (err) {
    next(err);
  }
};

export const updateAddressHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const addressId = parseInteger(req.params.addressId);
    const {
      linea1,
      linea2,
      ciudad,
      estado,
      codigo_postal: codigoPostal,
      pais
    } = req.body || {};

    const address = await updateAddressService({
      clientId,
      addressId,
      linea1,
      linea2,
      ciudad,
      estado,
      codigoPostal,
      pais
    });

    res.status(200).json({ data: address });
  } catch (err) {
    next(err);
  }
};

export const deleteAddressHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const addressId = parseInteger(req.params.addressId);

    await deleteAddressService({ clientId, addressId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
