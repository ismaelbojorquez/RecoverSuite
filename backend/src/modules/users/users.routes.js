import { Router } from 'express';
import {
  createUserHandler,
  deactivateUserHandler,
  deleteUserHandler,
  activateUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
  resetPasswordHandler,
  changePasswordHandler
} from './users.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users.read'), listUsersHandler);
router.get('/:id', authorize('users.read'), getUserHandler);
router.post('/', authorize('users.write'), createUserHandler);
router.put('/:id', authorize('users.write'), updateUserHandler);
router.delete('/:id', authorize('users.delete'), deleteUserHandler);
router.put('/:id/activate', authorize('users.deactivate'), activateUserHandler);
router.put('/:id/deactivate', authorize('users.deactivate'), deactivateUserHandler);
router.post('/:id/reset-password', authorize('users.reset_password'), resetPasswordHandler);
router.post('/change-password', changePasswordHandler);

export default router;
