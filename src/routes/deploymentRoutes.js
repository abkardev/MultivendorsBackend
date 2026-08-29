import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  createDeployment, listDeployments, getDeployment,
  updateDeploymentStatus, rollbackDeployment,
  assessProductionReadiness, getLatestReadiness, getReadinessHistory,
} from '../controllers/deploymentController.js';

const router = Router();

const ff = featureFlag('enterprise_deployment');

router.get('/deployments', protect, authorize('admin'), ff, listDeployments);
router.post('/deployments', protect, authorize('admin'), ff, createDeployment);
router.get('/deployments/:id', protect, authorize('admin'), ff, getDeployment);
router.put('/deployments/:id/status', protect, authorize('admin'), ff, updateDeploymentStatus);
router.post('/deployments/:id/rollback', protect, authorize('admin'), ff, rollbackDeployment);

router.post('/readiness/:environment/assess', protect, authorize('admin'), ff, assessProductionReadiness);
router.get('/readiness/:environment/latest', protect, authorize('admin'), ff, getLatestReadiness);
router.get('/readiness/:environment/history', protect, authorize('admin'), ff, getReadinessHistory);

export default router;
