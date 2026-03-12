import { createBulkImportService } from './bulk-imports.service.js';

export const createBulkImportHandler = async (req, res, next) => {
  try {
    const {
      tipo,
      expected_headers: expectedHeaders,
      portafolio_id: portafolioId,
      priority,
      prioridad,
      saldo_mapping: saldoMapping
    } = req.body || {};

    const job = await createBulkImportService({
      file: req.file,
      tipo,
      expectedHeaders,
      userId: req.user?.id,
      portafolioId,
      priority: priority ?? prioridad,
      saldoMapping
    });

    res.status(202).json({ job_id: job.id });
  } catch (err) {
    next(err);
  }
};
