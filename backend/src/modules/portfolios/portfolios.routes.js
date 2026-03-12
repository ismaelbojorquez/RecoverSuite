import { Router } from 'express';
import {
  createPortfolioHandler,
  deletePortfolioHandler,
  getPortfolioHandler,
  listPortfoliosHandler,
  updatePortfolioHandler
} from './portfolios.controller.js';
import balanceFieldRoutes from '../balance-fields/balance-fields.routes.js';
import { portfolioRouter as saldoFieldPortfolioRoutes } from '../saldo-fields/saldo-fields.routes.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('portfolios.read'), listPortfoliosHandler);
router.get('/:id', authorize('portfolios.read'), getPortfolioHandler);
router.post('/', authorize('portfolios.write'), createPortfolioHandler);
router.put('/:id', authorize('portfolios.write'), updatePortfolioHandler);
router.delete('/:id', authorize('portfolios.write'), deletePortfolioHandler);

router.use('/:portafolioId/balance-fields', balanceFieldRoutes);
router.use('/:portfolioId/saldo-fields', saldoFieldPortfolioRoutes);

export default router;
