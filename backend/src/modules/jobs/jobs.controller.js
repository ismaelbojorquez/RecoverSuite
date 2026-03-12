import { listJobs } from './jobs.repository.js';

const parseInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const listJobsHandler = async (req, res, next) => {
  try {
    const limit = parseInteger(req.query.limit, 10) || 10;
    const offset = parseInteger(req.query.offset, 0) || 0;

    const jobs = await listJobs({ limit, offset });
    res.status(200).json({ data: jobs });
  } catch (err) {
    next(err);
  }
};
