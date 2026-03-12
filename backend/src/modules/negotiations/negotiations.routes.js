import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createDiscountLevelHandler,
  createNegotiationHandler,
  listAvailableDiscountLevelsHandler,
  listClientNegotiationsHandler,
  listDiscountLevelsHandler,
  setDiscountLevelGroupsHandler,
  updateDiscountLevelHandler,
  updateNegotiationStatusHandler
} from './negotiations.controller.js';

const router = Router();

router.use(authenticate);

router.get('/discount-levels/available', authorize('negotiations.read'), listAvailableDiscountLevelsHandler);

router.get('/discount-levels', authorize('negotiations.config.read'), listDiscountLevelsHandler);
router.post('/discount-levels', authorize('negotiations.config.write'), createDiscountLevelHandler);
router.put('/discount-levels/:id', authorize('negotiations.config.write'), updateDiscountLevelHandler);
router.put('/discount-levels/:id/groups', authorize('negotiations.config.write'), setDiscountLevelGroupsHandler);

router.get('/clientes/:clienteId', authorize('negotiations.read'), listClientNegotiationsHandler);
router.post('/', authorize('negotiations.write'), createNegotiationHandler);
router.put('/:id/status', authorize('negotiations.write'), updateNegotiationStatusHandler);

export default router;

