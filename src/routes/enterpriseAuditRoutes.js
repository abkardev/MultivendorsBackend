import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getTimeline, getEntityHistory, getUserHistory, getSecurityEvents,
  getDiff, getComplianceReport, exportCsv, searchAuditLogs, getCorrelatedEvents,
} from '../controllers/enterpriseAuditController.js';

const router = Router();

const ff = featureFlag('enterprise_audit');

router.get('/timeline', protect, authorize('admin'), ff, getTimeline);
router.get('/search', protect, authorize('admin'), ff, searchAuditLogs);
router.get('/entity/:entityType/:entityId', protect, authorize('admin'), ff, getEntityHistory);
router.get('/user/:userId', protect, authorize('admin'), ff, getUserHistory);
router.get('/security', protect, authorize('admin'), ff, getSecurityEvents);
router.get('/diff/:entityType/:entityId/:logId', protect, authorize('admin'), ff, getDiff);
router.get('/compliance', protect, authorize('admin'), ff, getComplianceReport);
router.get('/export', protect, authorize('admin'), ff, exportCsv);
router.get('/correlated/:correlationId', protect, authorize('admin'), ff, getCorrelatedEvents);

export default router;
