import { Router } from 'express';
import { authenticate } from '../modules/auth/auth.middleware.js';
import { getLayoutHandler, saveLayoutHandler } from '../controllers/layout.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getLayoutHandler);
router.post('/', saveLayoutHandler);

export default router;
