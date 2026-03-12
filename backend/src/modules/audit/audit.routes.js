import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import { listBulkImportAuditsHandler } from './audit-imports.controller.js';

const router = Router();

router.use(authenticate);

router.get('/imports', authorize('imports.read'), listBulkImportAuditsHandler);

export default router;
