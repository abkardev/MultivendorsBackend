import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  sendFromTemplate, sendDigest, getNotificationAnalytics,
  listTemplates, createTemplate, updateTemplate,
} from '../controllers/enterpriseNotificationController.js';

const router = Router();

const ff = featureFlag('enterprise_notifications');

router.get('/templates', protect, ff, listTemplates);
router.post('/templates', protect, authorize('admin'), ff, createTemplate);
router.put('/templates/:id', protect, authorize('admin'), ff, updateTemplate);

router.post('/send-template', protect, ff, sendFromTemplate);
router.post('/digest', protect, ff, sendDigest);

router.get('/analytics', protect, authorize('admin'), ff, getNotificationAnalytics);

export default router;
