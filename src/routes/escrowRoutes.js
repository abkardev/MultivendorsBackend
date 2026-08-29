import express from 'express';
const router = express.Router();
import * as ctrl from '../controllers/escrowController.js';
import { confirmDelivery as shipmentConfirmDelivery } from '../controllers/shipmentController.js';
import { authorize as adminOnly, protect as auth } from '../middlewares/auth.js';
import { createUploadMiddleware, UPLOAD_CATEGORIES } from '../middlewares/uploadMiddleware.js';

const disputeUpload = createUploadMiddleware(UPLOAD_CATEGORIES.DISPUTE_EVIDENCE);

// ─── Orders ──────────────────────────────────────────────
router.get('/order', auth, ctrl.getOrders);
router.get('/order/my/:role', auth, ctrl.getMyOrders);
router.get('/order/:id', auth, ctrl.getOrderById);

// ─── Payments ────────────────────────────────────────────
router.post('/payment/create', auth, ctrl.createPayment);
router.get('/payment/order/:orderId', auth, ctrl.getPaymentByOrder);

// ─── Escrow Actions ──────────────────────────────────────
router.post('/escrow/confirm-delivery', auth, shipmentConfirmDelivery);
router.post('/escrow/release-funds', auth, adminOnly('admin'), ctrl.releaseFunds);
router.post('/escrow/update-shipping', auth, ctrl.updateShipping);

// ─── Wallet ──────────────────────────────────────────────
router.get('/wallet/me', auth, ctrl.getMyWallet);
router.get('/wallet/transactions', auth, ctrl.getTransactions);
router.post('/wallet/withdraw', auth, ctrl.withdraw);
router.get('/wallet/withdrawals', auth, ctrl.getWithdrawals);

// ─── Disputes ────────────────────────────────────────────
router.post('/dispute/open', auth, disputeUpload.array('evidence', 5), ctrl.openDispute);
router.get('/dispute', auth, adminOnly('admin'), ctrl.getAllDisputes);
router.get('/dispute/my', auth, ctrl.getMyDisputes);
router.get('/dispute/:id', auth, ctrl.getDispute);
router.post('/dispute/resolve', auth, adminOnly('admin'), ctrl.resolveDispute);
router.post('/dispute/:disputeId/evidence', auth, disputeUpload.array('evidence', 5), ctrl.addEvidence);

export default router;
