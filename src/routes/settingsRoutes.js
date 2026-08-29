import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  listSettings, getSetting, updateSetting, createSetting, deleteSetting,
  getPublicSettings, seedDefaultSettings,
} from '../controllers/settingsController.js';

const router = Router();

// Public
router.get('/settings/public', getPublicSettings);

// Admin only
router.get('/settings', protect, authorize('admin'), listSettings);
router.get('/settings/:key', protect, authorize('admin'), getSetting);
router.put('/settings/:key', protect, authorize('admin'), updateSetting);
router.post('/settings', protect, authorize('admin'), createSetting);
router.delete('/settings/:key', protect, authorize('admin'), deleteSetting);
router.post('/settings/seed', protect, authorize('admin'), seedDefaultSettings);

export default router;
