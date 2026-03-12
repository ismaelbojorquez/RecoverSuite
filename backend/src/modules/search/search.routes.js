import { Router } from 'express';
import { searchGlobalHandler } from './search.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('search.read'), searchGlobalHandler);

export default router;
