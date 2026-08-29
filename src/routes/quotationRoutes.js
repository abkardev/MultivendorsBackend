import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { createQuotation, getQuotations, getQuotationById, updateQuotation, submitQuotation, acceptQuotation, rejectQuotation, compareQuotations, getQuotationStats } from '../controllers/quotationController.js';

const router = Router();

router.get('/quotations/compare', protect, authorize('buyer', 'admin'), compareQuotations);
router.get('/quotations/stats', protect, authorize('vendor', 'buyer', 'admin'), getQuotationStats);
router.get('/quotations', protect, authorize('vendor', 'buyer', 'admin'), getQuotations);
router.get('/quotations/:id', protect, authorize('vendor', 'buyer', 'admin'), getQuotationById);
router.post('/quotations', protect, authorize('vendor', 'admin'), audit('create', 'quotation', (req) => `Created quotation for buyer ${req.body.buyer}`), createQuotation);
router.put('/quotations/:id', protect, authorize('vendor', 'admin'), updateQuotation);
router.post('/quotations/:id/submit', protect, authorize('vendor', 'admin'), submitQuotation);
router.post('/quotations/:id/accept', protect, authorize('buyer', 'admin'), acceptQuotation);
router.post('/quotations/:id/reject', protect, authorize('buyer', 'admin'), rejectQuotation);

export default router;
