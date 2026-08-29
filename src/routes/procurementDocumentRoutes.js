import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { generateDocument, getDocuments, getDocumentById, updateDocumentStatus, addDocumentVersion } from '../controllers/procurementDocumentController.js';

const router = Router();

router.get('/procurement-documents', protect, authorize('vendor', 'buyer', 'admin'), getDocuments);
router.get('/procurement-documents/:id', protect, authorize('vendor', 'buyer', 'admin'), getDocumentById);
router.post('/procurement-documents/generate', protect, authorize('vendor', 'admin'), audit('generate', 'procurement-document', (req) => `Generated ${req.body.docType} document from quotation ${req.body.quotationId}`), generateDocument);
router.put('/procurement-documents/:id/status', protect, authorize('vendor', 'buyer', 'admin'), updateDocumentStatus);
router.post('/procurement-documents/:id/version', protect, authorize('vendor', 'admin'), addDocumentVersion);

export default router;
