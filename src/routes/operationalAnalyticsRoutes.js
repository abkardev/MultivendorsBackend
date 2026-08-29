import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getOperationalDashboard, getSystemUsage, getFeatureAdoption,
  getAiUsage, getSearchUsage, getNotificationUsage,
  getPerformanceAnalytics, getErrorAnalytics, getGrowthMetrics,
} from '../controllers/operationalAnalyticsController.js';

const router = Router();

const ff = featureFlag('operational_analytics');

router.get('/dashboard', protect, authorize('admin'), ff, getOperationalDashboard);
router.get('/system-usage', protect, authorize('admin'), ff, getSystemUsage);
router.get('/feature-adoption', protect, authorize('admin'), ff, getFeatureAdoption);
router.get('/ai-usage', protect, authorize('admin'), ff, getAiUsage);
router.get('/search-usage', protect, authorize('admin'), ff, getSearchUsage);
router.get('/notification-usage', protect, authorize('admin'), ff, getNotificationUsage);
router.get('/performance', protect, authorize('admin'), ff, getPerformanceAnalytics);
router.get('/errors', protect, authorize('admin'), ff, getErrorAnalytics);
router.get('/growth', protect, authorize('admin'), ff, getGrowthMetrics);

export default router;
