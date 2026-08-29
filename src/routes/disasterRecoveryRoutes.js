import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  createBackupPolicy, updateBackupPolicy, listBackupPolicies,
  executeBackup, listBackupRecords, verifyBackup,
  createRecoveryPolicy, listRecoveryPolicies, simulateRecovery,
  getDisasterRecoverySummary,
} from '../controllers/disasterRecoveryController.js';

const router = Router();

const ff = featureFlag('enterprise_disaster_recovery');

router.get('/summary', protect, authorize('admin'), ff, getDisasterRecoverySummary);

router.get('/backup-policies', protect, authorize('admin'), ff, listBackupPolicies);
router.post('/backup-policies', protect, authorize('admin'), ff, createBackupPolicy);
router.put('/backup-policies/:id', protect, authorize('admin'), ff, updateBackupPolicy);
router.post('/backup-policies/:id/execute', protect, authorize('admin'), ff, executeBackup);

router.get('/backup-records/:policyId', protect, authorize('admin'), ff, listBackupRecords);
router.post('/backup-records/:id/verify', protect, authorize('admin'), ff, verifyBackup);

router.get('/recovery-policies', protect, authorize('admin'), ff, listRecoveryPolicies);
router.post('/recovery-policies', protect, authorize('admin'), ff, createRecoveryPolicy);
router.post('/recovery-policies/:id/simulate', protect, authorize('admin'), ff, simulateRecovery);

export default router;
