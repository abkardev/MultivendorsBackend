import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  runAllChecks, runCheck, getReportHistory, getLatestReport, autoFix,
} from '../controllers/enterpriseDiagnosticsController.js';

const router = Router();

const ff = featureFlag('enterprise_diagnostics');

router.post('/run', protect, authorize('admin'), ff, runAllChecks);
router.post('/run/:type', protect, authorize('admin'), ff, runCheck);
router.get('/reports', protect, authorize('admin'), ff, getReportHistory);
router.get('/reports/latest/:type', protect, authorize('admin'), ff, getLatestReport);
router.post('/autofix/:id', protect, authorize('admin'), ff, autoFix);

export default router;
