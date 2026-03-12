import { createHttpError } from '../../utils/http-error.js';
import {
  createPhoneService,
  deletePhoneService,
  getPhoneService,
  listPhonesService,
  updatePhoneService
} from './phones.service.js';

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

export const listPhonesHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const pagination = parsePagination(req);

    const phones = await listPhonesService({
      clientId,
      limit: pagination?.limit,
      offset: pagination?.offset
    });

    res.status(200).json({
      data: phones,
      ...(pagination ? pagination : {})
    });
  } catch (err) {
    next(err);
  }
};

export const getPhoneHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const phoneId = parseInteger(req.params.phoneId);

    const phone = await getPhoneService({ clientId, phoneId });

    res.status(200).json({ data: phone });
  } catch (err) {
    next(err);
  }
};

export const createPhoneHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const { telefono } = req.body || {};

    const phone = await createPhoneService({ clientId, telefono });

    res.status(201).json({ data: phone });
  } catch (err) {
    next(err);
  }
};

export const updatePhoneHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const phoneId = parseInteger(req.params.phoneId);
    const { telefono } = req.body || {};

    const phone = await updatePhoneService({ clientId, phoneId, telefono });

    res.status(200).json({ data: phone });
  } catch (err) {
    next(err);
  }
};

export const deletePhoneHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const phoneId = parseInteger(req.params.phoneId);

    await deletePhoneService({ clientId, phoneId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
