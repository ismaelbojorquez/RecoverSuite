import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  exportJobErrorsCsvHandler,
  listJobErrorsHandler
} from './job-errors.controller.js';
import { listJobsHandler } from './jobs.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('imports.read'), listJobsHandler);
router.get('/:jobId/errors', authorize('imports.read'), listJobErrorsHandler);
router.get('/:jobId/errors/export', authorize('imports.read'), exportJobErrorsCsvHandler);

export default router;
