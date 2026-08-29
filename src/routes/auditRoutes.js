import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { listAuditLogs, getAuditLog, getAuditResources, getAuditStats, deleteAuditLog, clearAuditLogs } from '../controllers/auditController.js';

const router = Router();

router.get('/audit/logs', protect, authorize('admin'), listAuditLogs);
router.get('/audit/logs/stats', protect, authorize('admin'), getAuditStats);
router.get('/audit/logs/resources', protect, authorize('admin'), getAuditResources);
router.get('/audit/logs/:id', protect, authorize('admin'), getAuditLog);
router.delete('/audit/logs/:id', protect, authorize('admin'), deleteAuditLog);
router.post('/audit/logs/clear', protect, authorize('admin'), clearAuditLogs);

export default router;
