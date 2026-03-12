import { Router } from 'express';
import {
  createPermissionHandler,
  deletePermissionHandler,
  getPermissionHandler,
  listPermissionsHandler,
  updatePermissionHandler
} from './permissions.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from './permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('permissions.read'), listPermissionsHandler);
router.get('/:id', authorize('permissions.read'), getPermissionHandler);
router.post('/', authorize('permissions.write'), createPermissionHandler);
router.put('/:id', authorize('permissions.write'), updatePermissionHandler);
router.delete('/:id', authorize('permissions.write'), deletePermissionHandler);

export default router;
