import { Router } from 'express';
import {
  createClientHandler,
  deleteClientHandler,
  getClientDetailHandler,
  getClientHandler,
  listClientsHandler,
  updateClientHandler
} from './clients.controller.js';
import phoneRoutes from './phones.routes.js';
import emailRoutes from './emails.routes.js';
import addressRoutes from './addresses.routes.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('clients.read'), listClientsHandler);
router.get('/:id/detail', authorize('clients.read'), getClientDetailHandler);
router.get('/:id', authorize('clients.read'), getClientHandler);
router.post('/', authorize('clients.write'), createClientHandler);
router.put('/:id', authorize('clients.write'), updateClientHandler);
router.delete('/:id', authorize('clients.write'), deleteClientHandler);

router.use('/:clientId/phones', phoneRoutes);
router.use('/:clientId/emails', emailRoutes);
router.use('/:clientId/addresses', addressRoutes);

export default router;
