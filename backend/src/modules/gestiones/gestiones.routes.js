import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createGestionHandler,
  listGestionesHandler,
  listHistorialClienteHandler
} from './gestiones.controller.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(['gestiones.view_all', 'gestiones.view_portfolio', 'gestiones.view_own']),
  listGestionesHandler
);
router.get(
  '/clientes/:clienteId/historial',
  authorize(['gestiones.view_all', 'gestiones.view_portfolio', 'gestiones.view_own']),
  listHistorialClienteHandler
);
router.post('/', authorize('gestiones.create'), createGestionHandler);

export default router;
