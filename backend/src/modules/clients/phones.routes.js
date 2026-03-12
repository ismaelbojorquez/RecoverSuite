import { Router } from 'express';
import {
  createPhoneHandler,
  deletePhoneHandler,
  getPhoneHandler,
  listPhonesHandler,
  updatePhoneHandler
} from './phones.controller.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', authorize('clients.contacts.read'), listPhonesHandler);
router.get('/:phoneId', authorize('clients.contacts.read'), getPhoneHandler);
router.post('/', authorize('clients.contacts.write'), createPhoneHandler);
router.put('/:phoneId', authorize('clients.contacts.write'), updatePhoneHandler);
router.delete('/:phoneId', authorize('clients.contacts.write'), deletePhoneHandler);

export default router;
