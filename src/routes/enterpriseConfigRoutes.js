import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  listSettings, getSetting, createSetting, updateSetting, deleteSetting,
  getVersionHistory, rollbackSetting, validateSetting,
  importSettings, exportSettings,
  listRuntimeConfigs, setRuntimeOverride, deleteRuntimeOverride,
} from '../controllers/enterpriseConfigController.js';

const router = Router();

const ff = featureFlag('enterprise_config');

router.get('/settings', protect, authorize('admin'), ff, listSettings);
router.get('/settings/:key', protect, authorize('admin'), ff, getSetting);
router.post('/settings', protect, authorize('admin'), ff, createSetting);
router.put('/settings/:key', protect, authorize('admin'), ff, updateSetting);
router.delete('/settings/:key', protect, authorize('admin'), ff, deleteSetting);
router.get('/settings/:key/version-history', protect, authorize('admin'), ff, getVersionHistory);
router.post('/settings/:key/rollback', protect, authorize('admin'), ff, rollbackSetting);
router.post('/settings/:key/validate', protect, authorize('admin'), ff, validateSetting);
router.post('/settings/import', protect, authorize('admin'), ff, importSettings);
router.get('/settings/export', protect, authorize('admin'), ff, exportSettings);

router.get('/runtime', protect, authorize('admin'), ff, listRuntimeConfigs);
router.put('/runtime/:key', protect, authorize('admin'), ff, setRuntimeOverride);
router.delete('/runtime/:key', protect, authorize('admin'), ff, deleteRuntimeOverride);

export default router;
