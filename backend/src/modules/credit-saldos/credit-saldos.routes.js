import { Router } from 'express';
import {
  listCreditSaldosHandler,
  upsertCreditSaldosHandler
} from './credit-saldos.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.get('/', authorize('balance_values.read'), listCreditSaldosHandler);
router.put('/', authorize('balance_values.write'), upsertCreditSaldosHandler);

export default router;
