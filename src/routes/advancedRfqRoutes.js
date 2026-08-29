import express from 'express';
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, autoMatchVendors, getRfqAnalytics } from '../controllers/advancedRfqController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/rfq/templates', protect, getTemplates);
router.get('/rfq/templates/:id', protect, getTemplateById);
router.post('/rfq/templates', protect, authorize('user', 'admin'), createTemplate);
router.put('/rfq/templates/:id', protect, authorize('user', 'admin'), updateTemplate);
router.delete('/rfq/templates/:id', protect, authorize('user', 'admin'), deleteTemplate);
router.get('/rfq/auto-match/:rfqId', protect, authorize('vendor'), autoMatchVendors);
router.get('/rfq/analytics', protect, authorize('user', 'admin'), getRfqAnalytics);

export default router;
