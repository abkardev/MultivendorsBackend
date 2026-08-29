import EscrowOrder from '../models/Order.js';
import Payment from '../models/Payment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import WebhookLog from '../models/webhookLogModel.js';
import { Vendor } from '../models/vendorModel.js';
import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = apiKey ? new Stripe(apiKey) : null;

async function stripeWebhook(req, res) {
  if (!stripe || !endpointSecret) {
    // Fail closed: never process Stripe events without a configured API key.
    return res.status(503).json({ received: false, error: 'Stripe webhook is not configured' });
  }

  let event;

  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const existing = await WebhookLog.findOne({ webhookId: event.id });
    const webhookLog = existing || await WebhookLog.create({
      webhookId: event.id,
      provider: 'stripe',
      event: event.type,
      payload: event,
      status: 'received',
      ip: req.ip,
    });
    if (existing) {
      // Replay of a previously processed event — idempotent no-op.
      return res.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { orderId, paymentId } = session.metadata;

        const payment = await Payment.findById(paymentId);
        if (!payment) break;

        payment.status = 'completed';
        payment.gatewayRef = session.payment_intent;
        payment.gatewayResponse = session;
        await payment.save();

        const order = await EscrowOrder.findById(orderId);
        if (!order) break;

        order.status = 'in_escrow';
        order.paymentId = payment._id;
        order.autoReleaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await order.save();

        // Credit seller's pending balance
        const vendorDoc = await Vendor.findById(order.vendor);
        if (vendorDoc) {
          let wallet = await Wallet.findOne({ user: vendorDoc.user });
          if (!wallet) wallet = await Wallet.create({ user: vendorDoc.user, currency: order.currency });

          wallet.pendingBalance += order.totalAmount;
          await wallet.save();

          await Transaction.create({
            wallet: wallet._id,
            user: vendorDoc.user,
            type: 'escrow_hold',
            amount: order.totalAmount,
            currency: order.currency,
            balance: wallet.pendingBalance,
            reference: order._id.toString(),
            description: `Escrow hold for order ${order.orderNumber}`,
          });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        // Find payment by gateway ref and mark as failed
        const payment = await Payment.findOne({ gatewayRef: intent.id });
        if (payment) {
          payment.status = 'failed';
          payment.gatewayResponse = intent;
          await payment.save();
        }
        break;
      }
    }

    await WebhookLog.updateOne({ _id: webhookLog._id }, { status: 'processed', processedAt: new Date() }).catch(() => {});
  } catch (error) {
    console.error('Webhook processing error:', error);
  }

  res.json({ received: true });
}

export default stripeWebhook;
