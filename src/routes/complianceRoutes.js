import express from 'express';
import {
  getComplianceStatus, getComplianceScore, uploadComplianceDocument, recalculateScore,
  getComplianceDashboard, getAdminComplianceDashboard, getAdminVerificationQueue,
  getExpiryMonitoring, adminReviewCompliance, getComplianceReports,
  getComplianceAuditLogs, getRiskAnalysis,
  getChecklists, createChecklist, updateChecklist,
  getProviders, createProvider, updateProvider, toggleProvider,
  getBadgeStatus, assignBadge, removeBadge,
} from '../controllers/complianceController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Vendor routes
router.get('/compliance/status', protect, authorize('vendor'), getComplianceStatus);
router.get('/compliance/dashboard', protect, authorize('vendor'), getComplianceDashboard);
router.get('/compliance/score', protect, authorize('vendor'), getComplianceScore);
router.get('/compliance/badge', protect, authorize('vendor'), getBadgeStatus);
router.post('/compliance/upload-document', protect, authorize('vendor'), uploadComplianceDocument);
router.post('/compliance/recalculate-score', protect, authorize('vendor'), recalculateScore);

// Admin routes
router.get('/compliance/admin/dashboard', protect, authorize('admin'), getAdminComplianceDashboard);
router.get('/compliance/admin/queue', protect, authorize('admin'), getAdminVerificationQueue);
router.get('/compliance/admin/reports', protect, authorize('admin'), getComplianceReports);
router.get('/compliance/admin/audit-logs', protect, authorize('admin'), getComplianceAuditLogs);
router.get('/compliance/admin/risk-analysis', protect, authorize('admin'), getRiskAnalysis);
router.get('/compliance/admin/expiry-monitoring', protect, authorize('admin'), getExpiryMonitoring);
router.post('/compliance/admin/review', protect, authorize('admin'), adminReviewCompliance);
router.post('/compliance/admin/assign-badge', protect, authorize('admin'), assignBadge);
router.post('/compliance/admin/remove-badge', protect, authorize('admin'), removeBadge);

// Checklist management (admin)
router.get('/compliance/admin/checklists', protect, authorize('admin'), getChecklists);
router.post('/compliance/admin/checklists', protect, authorize('admin'), createChecklist);
router.put('/compliance/admin/checklists/:id', protect, authorize('admin'), updateChecklist);

// Provider management (admin)
router.get('/compliance/admin/providers', protect, authorize('admin'), getProviders);
router.post('/compliance/admin/providers', protect, authorize('admin'), createProvider);
router.put('/compliance/admin/providers/:id', protect, authorize('admin'), updateProvider);
router.post('/compliance/admin/providers/:id/toggle', protect, authorize('admin'), toggleProvider);

// Vendor score by ID (admin)
router.get('/compliance/admin/score/:vendorId', protect, authorize('admin'), getComplianceScore);
router.post('/compliance/admin/recalculate/:vendorId', protect, authorize('admin'), recalculateScore);

export default router;
