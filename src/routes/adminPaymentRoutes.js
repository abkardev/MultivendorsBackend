import { Router } from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import * as pc from '../controllers/paymentController.js';
import { Currency, ExchangeRate } from '../services/payment/models/Currency.js';
import { CommissionRule } from '../services/payment/models/CommissionRule.js';
import { TaxRule } from '../services/payment/models/TaxRule.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(auth);
router.use(authorize('admin'));

/* Provider configs */
router.get('/providers', asyncHandler(pc.adminListProviderConfigs));
router.put('/providers/:provider', asyncHandler(pc.adminUpdateProviderConfig));

/* Currencies & exchange rates */
router.get('/currencies', asyncHandler(pc.adminListCurrencies));
router.put('/currencies/:code', asyncHandler(pc.adminUpdateCurrency));
router.post('/exchange-rates', asyncHandler(pc.adminUpdateExchangeRate));

/* Commission rules */
router.get('/commissions', asyncHandler(pc.adminListCommissionRules));
router.post('/commissions', asyncHandler(pc.adminCreateCommissionRule));

/* Tax rules */
router.get('/tax-rules', asyncHandler(pc.adminListTaxRules));
router.post('/tax-rules', asyncHandler(pc.adminCreateTaxRule));

/* Fraud reports */
router.get('/fraud-reports', asyncHandler(pc.adminListFraudReports));

/* Webhook events */
router.get('/webhook-events', asyncHandler(pc.adminListWebhookEvents));

/* Audit log */
router.get('/audits', asyncHandler(pc.adminListAudits));

/* Transactions */
router.get('/transactions', asyncHandler(pc.getTransactions));

/* Health check */
router.get('/health', asyncHandler(pc.adminHealthCheck));

/* Refund */
router.post('/refund', asyncHandler(pc.refundPaymentByAdmin));

export default router;
