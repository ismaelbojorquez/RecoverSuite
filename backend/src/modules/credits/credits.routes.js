import { Router } from 'express';
import {
  createCreditHandler,
  deleteCreditHandler,
  getCreditHandler,
  getCreditSummaryHandler,
  listCreditsHandler,
  updateCreditHandler
} from './credits.controller.js';
import balanceRoutes from '../balances/balances.routes.js';
import creditSaldosRoutes from '../credit-saldos/credit-saldos.routes.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('credits.read'), listCreditsHandler);
router.get('/:id/summary', authorize('credits.read'), getCreditSummaryHandler);
router.get('/:id', authorize('credits.read'), getCreditHandler);
router.post('/', authorize('credits.write'), createCreditHandler);
router.put('/:id', authorize('credits.write'), updateCreditHandler);
router.delete('/:id', authorize('credits.write'), deleteCreditHandler);

router.use('/:creditoId/balances', balanceRoutes);
router.use('/:creditId/saldos', creditSaldosRoutes);

export default router;
