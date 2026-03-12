import { createHttpError } from '../../utils/http-error.js';
import {
  createEmailService,
  deleteEmailService,
  getEmailService,
  listEmailsService,
  updateEmailService
} from './emails.service.js';

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

export const listEmailsHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const pagination = parsePagination(req);

    const emails = await listEmailsService({
      clientId,
      limit: pagination?.limit,
      offset: pagination?.offset
    });

    res.status(200).json({
      data: emails,
      ...(pagination ? pagination : {})
    });
  } catch (err) {
    next(err);
  }
};

export const getEmailHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const emailId = parseInteger(req.params.emailId);

    const email = await getEmailService({ clientId, emailId });

    res.status(200).json({ data: email });
  } catch (err) {
    next(err);
  }
};

export const createEmailHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const { email } = req.body || {};

    const created = await createEmailService({ clientId, email });

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

export const updateEmailHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const emailId = parseInteger(req.params.emailId);
    const { email } = req.body || {};

    const updated = await updateEmailService({ clientId, emailId, email });

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteEmailHandler = async (req, res, next) => {
  try {
    const clientId = parseInteger(req.params.clientId);
    const emailId = parseInteger(req.params.emailId);

    await deleteEmailService({ clientId, emailId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
