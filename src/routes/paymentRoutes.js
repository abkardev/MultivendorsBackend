import { Router } from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import * as pc from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/* All payment routes require authentication */
router.use(auth);

/* Payment operations */
router.post('/create', authorize('user'), asyncHandler(pc.createPayment));
router.post('/capture', authorize('user', 'vendor'), asyncHandler(pc.capturePayment));
router.post('/checkout-session', authorize('user'), asyncHandler(pc.createCheckoutSession));
router.get('/transactions', asyncHandler(pc.getTransactions));
router.get('/transactions/:id', asyncHandler(pc.getTransactionDetail));

/* Escrow */
router.post('/escrow/hold', authorize('user'), asyncHandler(pc.holdEscrow));
router.post('/escrow/:id/release', authorize('admin', 'vendor'), asyncHandler(pc.releaseEscrow));
router.post('/escrow/:id/refund', authorize('admin', 'user'), asyncHandler(pc.refundEscrow));
router.get('/escrow/order/:orderId', asyncHandler(pc.getEscrow));
router.get('/escrow/my', authorize('vendor'), asyncHandler(pc.listVendorEscrows));

/* Invoices */
router.get('/invoices', asyncHandler(pc.listMyInvoices));
router.get('/invoices/:id', asyncHandler(pc.getInvoice));

/* Webhook events */
router.get('/webhook-events', authorize('admin'), asyncHandler(pc.listWebhookEvents));
router.post('/webhook-events/:id/retry', authorize('admin'), asyncHandler(pc.retryWebhookEvent));

/* Payment status */
router.get('/status/:provider/:paymentId', asyncHandler(pc.getPaymentStatus));

export default router;
