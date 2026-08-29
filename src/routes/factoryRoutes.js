import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { getMyFactoryProfile, updateFactoryProfile, listFactoryProfiles, getFactoryProfile, verifyFactoryProfile, calculateSupplierScore } from '../controllers/factoryController.js';

const router = Router();
router.get('/factory/my-profile', protect, authorize('vendor', 'admin'), getMyFactoryProfile);
router.put('/factory/my-profile', protect, authorize('vendor', 'admin'), updateFactoryProfile);
router.get('/factory/profiles', protect, listFactoryProfiles);
router.get('/factory/profiles/:id', protect, getFactoryProfile);
router.post('/factory/profiles/:id/verify', protect, authorize('admin'), verifyFactoryProfile);
router.post('/factory/profiles/:id/score', protect, authorize('vendor', 'admin'), calculateSupplierScore);
export default router;
