import { Router } from 'express';
import {
  createEmailHandler,
  deleteEmailHandler,
  getEmailHandler,
  listEmailsHandler,
  updateEmailHandler
} from './emails.controller.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', authorize('clients.contacts.read'), listEmailsHandler);
router.get('/:emailId', authorize('clients.contacts.read'), getEmailHandler);
router.post('/', authorize('clients.contacts.write'), createEmailHandler);
router.put('/:emailId', authorize('clients.contacts.write'), updateEmailHandler);
router.delete('/:emailId', authorize('clients.contacts.write'), deleteEmailHandler);

export default router;
