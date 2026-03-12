import { Router } from 'express';
import {
  createBalanceFieldHandler,
  deleteBalanceFieldHandler,
  getBalanceFieldHandler,
  listBalanceFieldsHandler,
  updateBalanceFieldHandler
} from './balance-fields.controller.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', authorize('balance_fields.read'), listBalanceFieldsHandler);
router.get('/:fieldId', authorize('balance_fields.read'), getBalanceFieldHandler);
router.post('/', authorize('balance_fields.write'), createBalanceFieldHandler);
router.put('/:fieldId', authorize('balance_fields.write'), updateBalanceFieldHandler);
router.delete('/:fieldId', authorize('balance_fields.write'), deleteBalanceFieldHandler);

export default router;
