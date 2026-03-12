import { Router } from 'express';
import {
  createAddressHandler,
  deleteAddressHandler,
  getAddressHandler,
  listAddressesHandler,
  updateAddressHandler
} from './addresses.controller.js';
import { authorize } from '../permissions/permissions.middleware.js';

const router = Router({ mergeParams: true });

router.get('/', authorize('clients.contacts.read'), listAddressesHandler);
router.get('/:addressId', authorize('clients.contacts.read'), getAddressHandler);
router.post('/', authorize('clients.contacts.write'), createAddressHandler);
router.put('/:addressId', authorize('clients.contacts.write'), updateAddressHandler);
router.delete('/:addressId', authorize('clients.contacts.write'), deleteAddressHandler);

export default router;
