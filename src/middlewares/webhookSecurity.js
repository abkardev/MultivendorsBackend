import crypto from 'crypto';
import Stripe from 'stripe';
import WebhookLog from '../models/webhookLogModel.js';

const WEBHOOK_TIMESTAMP_WINDOW = 300;

// Sign over the exact bytes the provider transmitted when the raw body was
// buffered; otherwise fall back to a re-serialised JSON body.
const bodyString = (req) => (req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body));

export const verifyStripeWebhook = (req, secret) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) throw new Error('Missing Stripe signature');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const raw = req.rawBody
    ? req.rawBody.toString()
    : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const event = stripe.webhooks.constructEvent(raw, sig, secret);
  return event;
};

const paypalConfigError = () => {
  throw new Error(
    'PayPal webhooks are disabled. Set PAYPAL_ENABLED=true plus PAYPAL_API_URL, ' +
      'PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_WEBHOOK_ID to enable verification.'
  );
};

// Real PayPal webhook verification against the PayPal verify-webhook-signature
// API. Fail-closed: webhooks are rejected unless PayPal is fully enabled.
export const verifyPayPalWebhook = async (req, webhookId) => {
  if (process.env.PAYPAL_ENABLED !== 'true') {
    paypalConfigError();
  }

  const headers = req.headers;
  const transmissionId = headers['paypal-transmission-id'];
  const timestamp = headers['paypal-transmission-time'];
  const signature = headers['paypal-transmission-sig'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];

  if (!transmissionId || !timestamp || !signature || !certUrl || !authAlgo) {
    throw new Error('Missing PayPal webhook headers');
  }

  const eventTime = new Date(timestamp).getTime() / 1000;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - eventTime) > WEBHOOK_TIMESTAMP_WINDOW) {
    throw new Error('PayPal webhook timestamp out of window');
  }

  const apiUrl = process.env.PAYPAL_API_URL;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!apiUrl || !clientId || !clientSecret || !webhookId) {
    paypalConfigError();
  }

  const tokenRes = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenRes.ok) {
    throw new Error('PayPal access token request failed');
  }
  const tokenBody = await tokenRes.json();
  const accessToken = tokenBody.access_token;
  if (!accessToken) {
    throw new Error('PayPal access token missing from response');
  }

  const verifyRes = await fetch(`${apiUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: signature,
      transmission_time: timestamp,
      webhook_id: webhookId,
      webhook_event: req.body,
    }),
  });
  const result = verifyRes.ok ? await verifyRes.json() : null;
  if (!result || result.verification_status !== 'SUCCESS') {
    throw new Error('PayPal webhook signature verification failed');
  }

  return true;
};

export const verifyHyperPayWebhook = (req) => {
  const signature = req.headers['x-signature'];
  if (!signature) throw new Error('Missing HyperPay signature');

  const expected = crypto
    .createHmac('sha256', process.env.HYPERPAY_WEBHOOK_SECRET)
    .update(bodyString(req))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid HyperPay signature');
  }
  return true;
};

export const verifyMoyasarWebhook = (req) => {
  const signature = req.headers['x-moyasar-signature'];
  if (!signature) throw new Error('Missing Moyasar signature');

  const expected = crypto
    .createHmac('sha256', process.env.MOYASAR_WEBHOOK_SECRET)
    .update(bodyString(req))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid Moyasar signature');
  }
  return true;
};

export const verifyPayTabsWebhook = (req) => {
  const signature = req.headers['x-signature'] || req.body.signature;
  if (!signature) throw new Error('Missing PayTabs signature');

  const expected = crypto
    .createHash('sha256')
    .update(bodyString(req) + process.env.PAYTABS_SERVER_KEY)
    .digest('hex');

  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid PayTabs signature');
  }
  return true;
};

export const verifyAdyenWebhook = (req) => {
  const hmacKey = process.env.ADYEN_HMAC_KEY;
  if (!hmacKey) throw new Error('Missing Adyen HMAC key');

  const notification = req.body;
  if (!notification?.hmacSignature) throw new Error('Missing Adyen HMAC signature');

  // Adyen adapter is dormant; never silently accept. Compute HMAC-SHA256 over
  // the raw body and verify against the provided signature.
  const expectedSign = crypto
    .createHmac('sha256', hmacKey)
    .update(bodyString(req))
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(notification.hmacSignature), Buffer.from(expectedSign))) {
    throw new Error('Invalid Adyen HMAC signature');
  }
  return true;
};

export const checkReplay = async (webhookId) => {
  const existing = await WebhookLog.findOne({ webhookId });
  if (existing) {
    throw new Error(`Duplicate webhook: ${webhookId} already processed`);
  }
  return true;
};

export const webhookSecurity = (provider) => {
  return async (req, res, next) => {
    try {
      const verifiers = {
        stripe: () => verifyStripeWebhook(req, process.env.STRIPE_WEBHOOK_SECRET),
        paypal: () => verifyPayPalWebhook(req, process.env.PAYPAL_WEBHOOK_ID),
        hyperpay: () => verifyHyperPayWebhook(req),
        moyasar: () => verifyMoyasarWebhook(req),
        paytabs: () => verifyPayTabsWebhook(req),
        adyen: () => verifyAdyenWebhook(req),
      };

      const verify = verifiers[provider];
      if (!verify) throw new Error(`Unknown webhook provider: ${provider}`);

      const result = await verify();

      const webhookId = req.body.id || req.body.notificationItem?.notificationRequestItem?.pspReference;
      if (webhookId) {
        await checkReplay(webhookId);
      }

      const timestamp = req.body.created || req.body.eventDate || req.body.timestamp;
      if (timestamp) {
        const eventTime = new Date(timestamp).getTime() / 1000;
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - eventTime) > WEBHOOK_TIMESTAMP_WINDOW) {
          throw new Error('Webhook timestamp out of valid window');
        }
      }

      await WebhookLog.create({
        webhookId,
        provider,
        event: req.body.type || req.body.eventType,
        payload: req.body,
        headers: req.headers,
        status: 'received',
        ip: req.ip,
      });

      next();
    } catch (err) {
      await WebhookLog.create({
        provider,
        event: req.body?.type || req.body?.eventType,
        payload: req.body,
        headers: req.headers,
        status: 'failed',
        error: err.message,
        ip: req.ip,
      });
      return res.status(400).json({ status: false, message: 'Webhook verification failed' });
    }
  };
};
