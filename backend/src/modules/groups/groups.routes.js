import { Router } from 'express';
import {
  addGroupUserHandler,
  createGroupHandler,
  deleteGroupHandler,
  getGroupHandler,
  listGroupPermissionsHandler,
  listGroupUsersHandler,
  listGroupsHandler,
  removeGroupUserHandler,
  listGroupMembersHandler,
  addGroupMemberHandler,
  removeGroupMemberHandler,
  replaceGroupPermissionsHandler,
  updateGroupHandler
} from './groups.controller.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('groups.read'), listGroupsHandler);
router.get('/:id', authorize('groups.read'), getGroupHandler);
router.post('/', authorize('groups.create'), createGroupHandler);
router.put('/:id', authorize('groups.update'), updateGroupHandler);
router.delete('/:id', authorize('groups.delete'), deleteGroupHandler);

router.get('/:id/permissions', authorize('permissions.assign'), listGroupPermissionsHandler);
router.put('/:id/permissions', authorize('permissions.assign'), replaceGroupPermissionsHandler);

router.get('/:id/users', authorize('groups.read'), listGroupUsersHandler);
router.post('/:id/users', authorize('groups.update'), addGroupUserHandler);
router.delete('/:id/users/:userId', authorize('groups.update'), removeGroupUserHandler);

// Nuevos endpoints /members
router.get('/:id/members', authorize('groups.update'), listGroupMembersHandler);
router.post('/:id/members', authorize('groups.update'), addGroupMemberHandler);
router.delete('/:id/members/:userId', authorize('groups.update'), removeGroupMemberHandler);

export default router;
