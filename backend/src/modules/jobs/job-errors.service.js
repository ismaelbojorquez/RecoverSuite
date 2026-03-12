import { createHttpError } from '../../utils/http-error.js';
import { listJobErrorsByJob } from './job-errors.repository.js';

const ensurePositiveId = (value, label) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw createHttpError(400, `${label} invalido`);
  }
};

export const listJobErrorsService = async ({ jobId, limit, offset }) => {
  ensurePositiveId(jobId, 'job_id');
  return listJobErrorsByJob({ jobId, limit, offset });
};
