import express from 'express';
import {
  createVendor,
  deleteVendor,
  getVendorBySlug,
  getVendors,
  updateVendor,
} from '../controllers/vendorController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/vendors', getVendors);
router.get('/vendor/:slug', getVendorBySlug);
router.post('/vendor', protect, authorize('vendor', 'admin'), createVendor);
router.put('/vendor/:id', protect, authorize('vendor', 'admin'), updateVendor);
router.delete('/vendor/:id', protect, authorize('admin'), deleteVendor);

export default router;
