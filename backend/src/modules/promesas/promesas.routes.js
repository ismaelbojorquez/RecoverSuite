import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createPromesaHandler,
  listPromesasHandler,
  updatePromesaEstadoHandler
} from './promesas.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('promesas.read'), listPromesasHandler);
router.post('/', authorize('promesas.write'), createPromesaHandler);
router.put('/:gestionId/estado', authorize('promesas.write'), updatePromesaEstadoHandler);

export default router;
