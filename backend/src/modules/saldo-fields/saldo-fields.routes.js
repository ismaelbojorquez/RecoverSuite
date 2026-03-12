import { Router } from 'express';
import {
  createSaldoFieldHandler,
  deleteSaldoFieldHandler,
  listSaldoFieldsHandler,
  updateSaldoFieldHandler
} from './saldo-fields.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const portfolioRouter = Router({ mergeParams: true });
portfolioRouter.use(authenticate);
portfolioRouter.get('/', authorize('balance_fields.read'), listSaldoFieldsHandler);
portfolioRouter.post('/', authorize('balance_fields.write'), createSaldoFieldHandler);

const saldoFieldRouter = Router();
saldoFieldRouter.use(authenticate);
saldoFieldRouter.put('/:fieldId', authorize('balance_fields.write'), updateSaldoFieldHandler);
saldoFieldRouter.delete('/:fieldId', authorize('balance_fields.write'), deleteSaldoFieldHandler);

export { portfolioRouter };
export default saldoFieldRouter;
