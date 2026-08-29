import express from 'express';
import {
  getProcurementRequests, getProcurementRequestById, createProcurementRequest,
  updateProcurementRequest, deleteProcurementRequest, submitForApproval,
  getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder,
  getProcurementStats,
} from '../controllers/procurementController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/procurement/requests', protect, authorize('user', 'admin'), getProcurementRequests);
router.get('/procurement/requests/stats', protect, authorize('user', 'admin'), getProcurementStats);
router.get('/procurement/requests/:id', protect, authorize('user', 'admin'), getProcurementRequestById);
router.post('/procurement/requests', protect, authorize('user', 'admin'), createProcurementRequest);
router.put('/procurement/requests/:id', protect, authorize('user', 'admin'), updateProcurementRequest);
router.delete('/procurement/requests/:id', protect, authorize('user', 'admin'), deleteProcurementRequest);
router.post('/procurement/requests/:id/submit', protect, authorize('user', 'admin'), submitForApproval);

router.get('/procurement/orders', protect, authorize('vendor', 'admin'), getPurchaseOrders);
router.get('/procurement/orders/:id', protect, authorize('vendor', 'admin'), getPurchaseOrderById);
router.post('/procurement/orders', protect, authorize('vendor', 'admin'), createPurchaseOrder);
router.put('/procurement/orders/:id', protect, authorize('vendor', 'admin'), updatePurchaseOrder);

export default router;
