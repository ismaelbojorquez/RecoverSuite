import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createResultadoHandler,
  getResultadoHandler,
  listResultadosHandler,
  updateResultadoHandler
} from './resultados.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('gestiones.read'), listResultadosHandler);
router.get('/:id', authorize('gestiones.read'), getResultadoHandler);
router.post('/', authorize('gestiones.write'), createResultadoHandler);
router.put('/:id', authorize('gestiones.write'), updateResultadoHandler);

export default router;
