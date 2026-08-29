import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getHealthStatus, getMetrics, getRealtimeMetrics, getHistoricalMetrics,
  createAlert, updateAlert, listAlerts, getSystemStats, recordHealthCheck,
} from '../controllers/monitoringController.js';

const router = Router();

const ff = featureFlag('enterprise_monitoring');

router.get('/health', ff, getHealthStatus);
router.get('/metrics', protect, authorize('admin'), ff, getMetrics);
router.get('/metrics/realtime', protect, authorize('admin'), ff, getRealtimeMetrics);
router.get('/metrics/historical/:metric', protect, authorize('admin'), ff, getHistoricalMetrics);
router.get('/alerts', protect, authorize('admin'), ff, listAlerts);
router.post('/alerts', protect, authorize('admin'), ff, createAlert);
router.put('/alerts/:id', protect, authorize('admin'), ff, updateAlert);
router.get('/stats', protect, authorize('admin'), ff, getSystemStats);
router.post('/health/check', protect, authorize('admin'), ff, recordHealthCheck);

export default router;
