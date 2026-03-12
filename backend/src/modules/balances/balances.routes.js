import { Router } from 'express';
import {
  createBalanceHandler,
  deleteBalanceHandler,
  getBalanceHandler,
  listBalancesHandler,
  updateBalanceHandler
} from './balances.controller.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', authorize('balance_values.read'), listBalancesHandler);
router.get('/:saldoId', authorize('balance_values.read'), getBalanceHandler);
router.post('/', authorize('balance_values.write'), createBalanceHandler);
router.put('/:saldoId', authorize('balance_values.write'), updateBalanceHandler);
router.delete('/:saldoId', authorize('balance_values.write'), deleteBalanceHandler);

export default router;
