import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import {
  createCampaignExportHandler,
  downloadCampaignFileHandler,
  getCampaignExportHandler,
  listCampaignExportsHandler
} from './campaigns.controller.js';

const router = Router();

router.use(authenticate);

router.get(
  '/exports',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  listCampaignExportsHandler
);
router.get(
  '/exports/:exportId',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  getCampaignExportHandler
);
router.get(
  '/exports/:exportId/files/:channel',
  authorize(['imports.read', 'gestiones.view_all', 'gestiones.view_portfolio']),
  downloadCampaignFileHandler
);
router.post(
  '/exports',
  authorize(['imports.read', 'gestiones.create', 'gestiones.view_all']),
  createCampaignExportHandler
);

export default router;
