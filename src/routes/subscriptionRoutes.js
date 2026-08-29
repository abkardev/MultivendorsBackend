import express from 'express';
import { getMine, createCheckout, cancel, changePlan, adminList, adminAssign, adminAnalytics } from '../controllers/subscriptionController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.get('/subscription/me', protect, getMine);
router.post('/subscription/checkout', protect, createCheckout);
router.post('/subscription/cancel', protect, audit('update', 'subscription', (req) => `Cancelled subscription by ${req.user.name}`), cancel);
router.post('/subscription/change-plan', protect, audit('update', 'subscription', (req) => `Changed subscription plan by ${req.user.name}`), changePlan);

router.get('/admin/subscriptions', protect, authorize('admin'), adminList);
router.post('/admin/subscriptions/assign', protect, authorize('admin'), adminAssign);
router.get('/admin/subscriptions/analytics', protect, authorize('admin'), adminAnalytics);

export default router;
