import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';
import {
  uploadFile, getFile, deleteFile, getSignedUrl, downloadFile,
  listFiles, getStorageStats, getUploadTrends, getDownloadTrends,
  listCategories, healthCheck,
} from '../controllers/storageController.js';

const router = express.Router();

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain', 'application/zip',
  'video/mp4', 'video/quicktime',
];
const MAX_SIZE = 200 * 1024 * 1024;

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

router.get('/health', healthCheck);
router.get('/categories', protect, listCategories);
router.get('/files', protect, listFiles);
router.get('/files/stats', protect, authorize('admin'), getStorageStats);
router.get('/files/trends/upload', protect, authorize('admin'), getUploadTrends);
router.get('/files/trends/download', protect, authorize('admin'), getDownloadTrends);
router.post('/upload', protect, upload.single('file'), audit('upload', 'file', (req) => `Uploaded ${req.file?.originalname}`), uploadFile);
router.get('/files/:id', protect, getFile);
router.get('/files/:id/download', protect, downloadFile);
router.get('/files/:id/signed-url', protect, getSignedUrl);
router.delete('/files/:id', protect, audit('delete', 'file', (req) => `Deleted file ${req.params.id}`), deleteFile);

export default router;
