import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createDictamenHandler,
  deleteDictamenHandler,
  getDictamenHandler,
  listDictamenesHandler,
  updateDictamenHandler
} from './dictamenes.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['dictamenes.read', 'gestiones.create']), listDictamenesHandler);
router.get('/:id', authorize('dictamenes.read'), getDictamenHandler);
router.post('/', authorize('dictamenes.write'), createDictamenHandler);
router.put('/:id', authorize('dictamenes.write'), updateDictamenHandler);
router.delete('/:id', authorize('dictamenes.write'), deleteDictamenHandler);

export default router;
