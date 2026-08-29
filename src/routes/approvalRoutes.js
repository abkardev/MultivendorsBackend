import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, listApprovalRequests, getApprovalRequest, createApprovalRequest, approveStep, rejectStep, cancelApprovalRequest } from '../controllers/approvalController.js';

const router = Router();
router.get('/approval/workflows', protect, authorize('admin'), listWorkflows);
router.post('/approval/workflows', protect, authorize('admin'), createWorkflow);
router.put('/approval/workflows/:id', protect, authorize('admin'), updateWorkflow);
router.delete('/approval/workflows/:id', protect, authorize('admin'), deleteWorkflow);
router.get('/approval/requests', protect, listApprovalRequests);
router.get('/approval/requests/:id', protect, getApprovalRequest);
router.post('/approval/requests', protect, createApprovalRequest);
router.post('/approval/requests/:id/approve', protect, approveStep);
router.post('/approval/requests/:id/reject', protect, rejectStep);
router.post('/approval/requests/:id/cancel', protect, cancelApprovalRequest);
export default router;
