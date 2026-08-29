import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getSecurityReport, getSecurityHeaders,
  detectSuspiciousActivity, getSuspiciousIps, requireAdminApproval,
} from '../controllers/securityController.js';

const router = Router();

const ff = featureFlag('enterprise_security');

router.get('/report', protect, authorize('admin'), ff, getSecurityReport);
router.get('/headers', ff, getSecurityHeaders);
router.post('/detect', protect, authorize('admin'), ff, detectSuspiciousActivity);
router.get('/suspicious-ips', protect, authorize('admin'), ff, getSuspiciousIps);
router.post('/admin-approval', protect, authorize('admin'), ff, requireAdminApproval);

export default router;
