import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getCacheStats, clearCache, invalidateGroup, invalidateTag,
  warmupCache, getMemoryUsage,
} from '../controllers/enterpriseCacheController.js';

const router = Router();

const ff = featureFlag('enterprise_cache');

router.get('/stats', protect, authorize('admin'), ff, getCacheStats);
router.post('/clear', protect, authorize('admin'), ff, clearCache);
router.post('/invalidate/group/:group', protect, authorize('admin'), ff, invalidateGroup);
router.post('/invalidate/tag/:tag', protect, authorize('admin'), ff, invalidateTag);
router.post('/warmup', protect, authorize('admin'), ff, warmupCache);
router.get('/memory', protect, authorize('admin'), ff, getMemoryUsage);

export default router;
