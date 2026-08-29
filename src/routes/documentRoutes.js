import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  listDocuments, getDocument, createDocument, updateDocument, deleteDocument,
  addVersion, reviewDocument, getExpiringDocuments,
} from '../controllers/documentController.js';

const router = Router();
router.get('/documents/expiring', protect, authorize('admin'), getExpiringDocuments);
router.get('/documents', protect, listDocuments);
router.get('/documents/:id', protect, getDocument);
router.post('/documents', protect, createDocument);
router.put('/documents/:id', protect, updateDocument);
router.delete('/documents/:id', protect, deleteDocument);
router.post('/documents/:id/versions', protect, addVersion);
router.put('/documents/:id/review', protect, authorize('admin'), reviewDocument);
export default router;
