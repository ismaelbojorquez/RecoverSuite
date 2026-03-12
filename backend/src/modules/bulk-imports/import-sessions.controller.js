import {
  createImportSessionService,
  getImportSessionPreviewService,
  getImportSessionService,
  runImportSessionService,
  saveImportSessionMappingService,
  uploadSessionFileService,
  validateImportSessionService
} from './import-sessions.service.js';
import { createHttpError } from '../../utils/http-error.js';
import {
  downloadSessionErrorsService,
  downloadRejectedRowsService
} from './import-sessions.errors.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildAuditContext = (req) => ({
  ip: req.ip,
  permissions: req.user?.permissions,
  groups: req.user?.groups
});

export const createImportSessionHandler = async (req, res, next) => {
  try {
    const { portfolio_id, portfolioId } = req.body || {};
    const portfolioValue = portfolioId ?? portfolio_id;
    if (portfolioValue === undefined || portfolioValue === null) {
      throw createHttpError(400, 'portfolioId es requerido');
    }

    const session = await createImportSessionService({
      portfolioId: portfolioValue,
      userId: req.user?.id,
      audit: buildAuditContext(req)
    });

    res.status(201).json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const uploadImportSessionFileHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await uploadSessionFileService({
      sessionId,
      file: req.file,
      userId: req.user?.id,
      audit: buildAuditContext(req)
    });

    res.status(200).json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const getImportSessionPreviewHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const limit = parseInteger(req.query.limit);

    const preview = await getImportSessionPreviewService({
      sessionId,
      limit: limit ?? undefined
    });

    res.status(200).json({ data: preview });
  } catch (err) {
    next(err);
  }
};

export const saveImportSessionMappingHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { mapping, strategy } = req.body || {};

    const session = await saveImportSessionMappingService({
      sessionId,
      mapping,
      strategy,
      userId: req.user?.id,
      audit: buildAuditContext(req)
    });

    res.status(200).json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const validateImportSessionHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    const result = await validateImportSessionService({
      sessionId,
      userId: req.user?.id,
      audit: buildAuditContext(req)
    });

    res.status(200).json({ data: result.session, summary: result.summary });
  } catch (err) {
    next(err);
  }
};

export const runImportSessionHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    const result = await runImportSessionService({
      sessionId,
      userId: req.user?.id,
      audit: buildAuditContext(req)
    });

    res
      .status(202)
      .json({ data: result.session, job_id: result.job?.id ?? null });
  } catch (err) {
    next(err);
  }
};

export const getImportSessionHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await getImportSessionService({ sessionId });

    res.status(200).json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const downloadImportSessionErrorsHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const format = (req.query.format || 'csv').toLowerCase();
    const mode = (req.query.mode || req.query.type || 'errors').toLowerCase();

    if (mode === 'rejected') {
      await downloadRejectedRowsService({ sessionId, res });
      return;
    }

    await downloadSessionErrorsService({ sessionId, format, res });
  } catch (err) {
    next(err);
  }
};
