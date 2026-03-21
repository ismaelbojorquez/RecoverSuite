import { Router } from 'express';
import { authenticate } from '../modules/auth/auth.middleware.js';
import { authorize } from '../modules/permissions/permissions.middleware.js';
import legacyCampaignExportRoutes from '../modules/campaigns/campaigns.routes.js';
import {
  downloadCampaignFileHandler,
  generarCampaignHandler,
  getCampaignHandler,
  listCampaignsHandler
} from '../controllers/campaignController.js';

const router = Router();

router.use(legacyCampaignExportRoutes);
router.use(authenticate);

router.post(
  '/generar',
  authorize(['imports.read', 'gestiones.create', 'gestiones.view_all']),
  generarCampaignHandler
);
router.get(
  '/',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  listCampaignsHandler
);
router.get(
  '/:id/download/:canal',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  downloadCampaignFileHandler
);
router.get(
  '/:id',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  getCampaignHandler
);

export default router;
