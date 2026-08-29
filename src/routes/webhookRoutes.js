import { Router } from 'express';
import express from 'express';
import { StripeProvider } from '../services/payment/providers/StripeProvider.js';
import { PayPalProvider } from '../services/payment/providers/PayPalProvider.js';
import { HyperPayProvider } from '../services/payment/providers/HyperPayProvider.js';
import { PayTabsProvider } from '../services/payment/providers/PayTabsProvider.js';
import { AdyenProvider } from '../services/payment/providers/AdyenProvider.js';
import { MoyasarProvider } from '../services/payment/providers/MoyasarProvider.js';
import { paymentOrchestrator } from '../services/payment/PaymentOrchestrator.js';
import { webhookSecurity } from '../middlewares/webhookSecurity.js';
import WebhookLog from '../models/webhookLogModel.js';

const PROVIDER_MAP = {
  stripe: StripeProvider,
  paypal: PayPalProvider,
  hyperpay: HyperPayProvider,
  paytabs: PayTabsProvider,
  adyen: AdyenProvider,
  moyasar: MoyasarProvider,
};

const router = Router();

// Preserve the raw request body (buffered by express.json verify) so HMAC
// verifiers can sign the exact byte string the provider transmitted.
router.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

const verifyProviderWebhook = (req, res, next) => {
  const middleware = webhookSecurity(req.params.provider);
  return middleware(req, res, next);
};

router.post('/:provider/webhook', verifyProviderWebhook, async (req, res) => {
  const { provider } = req.params;
  if (!PROVIDER_MAP[provider]) return res.status(400).json({ error: 'Unknown provider' });
  try {
    const event = await paymentOrchestrator.processWebhook(provider, req.body, req.headers);
    const logId = req.body.id || req.body.notificationItem?.notificationRequestItem?.pspReference;
    if (logId) {
      await WebhookLog.updateOne({ webhookId: logId }, { status: 'processed', processedAt: new Date() }).catch(() => {});
    }
    res.json({ received: true, event: event.type });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
