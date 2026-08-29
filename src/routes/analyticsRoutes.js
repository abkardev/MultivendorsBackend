import express from 'express';
import { getBuyerAnalytics, getVendorAnalytics, getAdminAnalytics } from '../controllers/analyticsController.js';
import { authorize, protect } from '../middlewares/auth.js';
import { loadSubscription, requireActiveSubscription, requireFeature } from '../middlewares/planLimits.js';

const router = express.Router();

router.get('/analytics/buyer', protect, authorize('user'), getBuyerAnalytics);
router.get('/analytics/vendor', protect, authorize('vendor'), loadSubscription, requireActiveSubscription, requireFeature(f => f.analytics, 'Analytics requires an active subscription'), getVendorAnalytics);
router.get('/analytics/admin', protect, authorize('admin'), getAdminAnalytics);

export default router;
