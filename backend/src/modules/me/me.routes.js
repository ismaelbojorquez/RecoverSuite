import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { getMeHandler } from './me.controller.js';

const router = Router();

router.get('/', authenticate, getMeHandler);

export default router;
