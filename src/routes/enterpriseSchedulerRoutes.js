import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  registerJob, updateJob, listJobs, getJob,
  pauseJob, resumeJob, executeJobManually,
  getExecutions, getQueueStats, getDependencyGraph, retryFailedExecution,
} from '../controllers/enterpriseSchedulerController.js';

const router = Router();

const ff = featureFlag('enterprise_scheduler');

router.get('/jobs', protect, authorize('admin'), ff, listJobs);
router.post('/jobs', protect, authorize('admin'), ff, registerJob);
router.get('/jobs/:id', protect, authorize('admin'), ff, getJob);
router.put('/jobs/:id', protect, authorize('admin'), ff, updateJob);
router.post('/jobs/:id/pause', protect, authorize('admin'), ff, pauseJob);
router.post('/jobs/:id/resume', protect, authorize('admin'), ff, resumeJob);
router.post('/jobs/:id/execute', protect, authorize('admin'), ff, executeJobManually);
router.get('/jobs/:id/executions', protect, authorize('admin'), ff, getExecutions);
router.get('/queue/stats', protect, authorize('admin'), ff, getQueueStats);
router.get('/queue/dependency-graph', protect, authorize('admin'), ff, getDependencyGraph);
router.post('/queue/retry/:executionId', protect, authorize('admin'), ff, retryFailedExecution);

export default router;
