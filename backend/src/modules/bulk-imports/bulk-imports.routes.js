import { Router } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import env from '../../config/env.js';
import { authenticate } from '../auth/auth.middleware.js';
import { authorize } from '../permissions/permissions.middleware.js';
import { createBulkImportHandler } from './bulk-imports.controller.js';
import {
  createImportSessionHandler,
  getImportSessionHandler,
  getImportSessionPreviewHandler,
  runImportSessionHandler,
  saveImportSessionMappingHandler,
  uploadImportSessionFileHandler,
  validateImportSessionHandler
} from './import-sessions.controller.js';
import { downloadImportSessionErrorsHandler } from './import-sessions.controller.js';
import { getImportTargetsHandler } from './bulk-imports.targets.controller.js';
import { createHttpError } from '../../utils/http-error.js';

const router = Router();

const resolveUploadDir = () => path.resolve(process.cwd(), env.uploads.dir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolveUploadDir();
    fs.mkdir(uploadDir, { recursive: true }, (err) => cb(err, uploadDir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `import-${unique}${ext}`);
  }
});

const maxSizeMb = Number.isFinite(env.uploads.maxSizeMb)
  ? env.uploads.maxSizeMb
  : 50;

const allowedExt = new Set(['.csv', '.xlsx']);
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedExt.has(ext)) {
    return cb(createHttpError(400, 'Formato de archivo no soportado'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeMb * 1024 * 1024
  },
  fileFilter
});

router.use(authenticate);

router.post(
  '/',
  authorize(['BULK_IMPORT_CREATE', 'imports.write']),
  upload.single('file'),
  createBulkImportHandler
);
router.get('/targets', authorize(['BULK_IMPORT_VIEW', 'imports.write']), getImportTargetsHandler);
router.post('/sessions', authorize(['BULK_IMPORT_CREATE', 'imports.write']), createImportSessionHandler);
router.post(
  '/sessions/:id/upload',
  authorize(['BULK_IMPORT_CREATE', 'imports.write']),
  upload.single('file'),
  uploadImportSessionFileHandler
);
router.get(
  '/sessions/:id/preview',
  authorize(['BULK_IMPORT_VIEW', 'imports.write']),
  getImportSessionPreviewHandler
);
router.put(
  '/sessions/:id/mapping',
  authorize(['BULK_IMPORT_CREATE', 'imports.write']),
  saveImportSessionMappingHandler
);
router.post(
  '/sessions/:id/validate',
  authorize(['BULK_IMPORT_CREATE', 'imports.write']),
  validateImportSessionHandler
);
router.post('/sessions/:id/run', authorize(['BULK_IMPORT_RUN', 'imports.write']), runImportSessionHandler);
router.get('/sessions/:id', authorize(['BULK_IMPORT_VIEW', 'imports.write']), getImportSessionHandler);
router.get(
  '/sessions/:id/errors',
  authorize(['BULK_IMPORT_VIEW', 'imports.write']),
  downloadImportSessionErrorsHandler
);

export default router;
