import Payment from '../../models/Payment.js';
import EscrowOrder from '../../models/Order.js';
import Wallet from '../../models/Wallet.js';
import Transaction from '../../models/Transaction.js';
import { Vendor } from '../../models/vendorModel.js';
import { notificationService } from '../notificationService.js';
import { logger } from '../logger.js';

const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';
const STATUS_REFUNDED = 'refunded';

// Normalise a verified webhook payload into { paymentId, status, amount, currency }.
// NOTE: this runs ONLY after webhookSecurity has verified the provider signature.
export function parseProviderPaymentEvent(provider, payload) {
  switch (provider) {
    case 'moyasar': {
      const statusObj = payload?.status || payload?.payment || {};
      const paymentId = statusObj?.id || payload?.id;
      const rawStatus = statusObj?.status || (typeof payload?.type === 'string' ? payload.type : '');
      let status;
      if (['paid', 'captured'].includes(rawStatus)) status = STATUS_COMPLETED;
      else if (rawStatus === 'failed') status = STATUS_FAILED;
      else if (['cancelled', 'canceled', 'expired'].includes(rawStatus)) status = STATUS_FAILED;
      else if (rawStatus === 'refunded') status = STATUS_REFUNDED;
      return { paymentId, status, amount: statusObj?.amount, currency: statusObj?.currency, rawStatus };
    }
    case 'hyperpay': {
      const notif = payload?.notification;
      const path = notif?.resource?.path || '';
      const idx = path.indexOf('/v1/payments/');
      const paymentId = (idx >= 0 ? path.slice(idx + '/v1/payments/'.length).split('/')[0] : null);
      const code = notif?.result?.code || '';
      let status;
      if (code.startsWith('000.000') || code.startsWith('000.100')) status = STATUS_COMPLETED;
      else if (code.startsWith('000.200') || code.startsWith('000.300') || code.startsWith('000.7') || code.startsWith('001.')) status = STATUS_FAILED;
      else if (code.startsWith('000.400') || code.startsWith('000.500') || code.startsWith('000.600')) status = STATUS_FAILED;
      return { paymentId, status, amount: notif?.amount?.amount, currency: notif?.amount?.currency, rawStatus: code };
    }
    case 'paytabs': {
      const paymentId = payload?.tran_ref || payload?.cart_id || null;
      const code = String(payload?.resp_code ?? payload?.response_code ?? '');
      let status;
      if (code === '100' || code === '0') status = STATUS_COMPLETED;
      else if (code.startsWith('2') || ['900', '902', '912', '913'].includes(code)) status = STATUS_FAILED;
      return { paymentId, status, amount: payload?.cart_amount, currency: payload?.cart_currency, rawStatus: code };
    }
    case 'paypal': {
      const paymentId = payload?.resource?.id || payload?.id || null;
      const type = payload?.event_type || payload?.type || '';
      let status;
      if (['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.AUTHORIZATION.CREATED', 'CHECKOUT.ORDER.APPROVED'].includes(type)) status = STATUS_COMPLETED;
      else if (['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.REVERSED'].includes(type)) status = STATUS_FAILED;
      else if (['PAYMENT.CAPTURE.REFUNDED'].includes(type)) status = STATUS_REFUNDED;
      return { paymentId, status, amount: payload?.resource?.amount?.value, currency: payload?.resource?.amount?.currency_code, rawStatus: type };
    }
    case 'adyen': {
      const item = payload?.notificationItems?.[0]?.NotificationRequestItem;
      const paymentId = item?.pspReference || null;
      const code = item?.eventCode || '';
      const success = item?.success === 'true' || item?.success === true;
      let status;
      if (code === 'AUTHORISATION' && success) status = STATUS_COMPLETED;
      else if (['REFUSED', 'CANCELLED', 'EXPIRY'].includes(code)) status = STATUS_FAILED;
      else if (['REFUND', 'REFUNDED_REVERSED'].includes(code)) status = STATUS_REFUNDED;
      return { paymentId, status, amount: item?.amount?.value, currency: item?.amount?.currency, rawStatus: code };
    }
    case 'stripe': {
      const data = payload?.data?.object || payload?.object || {};
      const type = payload?.type || '';
      const paymentId = data?.payment_intent || data?.id || payload?.id || null;
      let status;
      if (['checkout.session.completed', 'payment_intent.succeeded'].includes(type)) status = STATUS_COMPLETED;
      else if (['payment_intent.payment_failed'].includes(type)) status = STATUS_FAILED;
      else if (['charge.refunded'].includes(type)) status = STATUS_REFUNDED;
      return { paymentId, status, amount: data?.amount, currency: data?.currency, rawStatus: type };
    }
    default:
      return { paymentId: null, status: null, rawStatus: '' };
  }
}

function amountsMatch(storedAmount, eventAmount) {
  if (eventAmount === undefined || eventAmount === null) return true;
  const expectedMinor = Math.round(Number(storedAmount) * 100);
  const provided = Number(eventAmount);
  const matchesMinor = Math.abs(provided - expectedMinor) < 0.01;
  const matchesMajor = Math.abs(provided - Number(storedAmount)) < 0.01;
  return matchesMinor || matchesMajor;
}

// Complete escrow once a verified webhook confirms capture of funds.
// Order of operations is intentionally: claim the Payment first (atomic
// findOneAndUpdate), then escrow + wallet. No client path can reach here.
async function finalizeCompleted(payment, paymentId) {
  const order = await EscrowOrder.findById(payment.order);
  if (order && ['pending', 'awaiting_payment', 'in_escrow'].includes(order.status)) {
    order.status = 'in_escrow';
    order.paymentId = payment._id;
    order.paymentMethod = payment.method;
    order.autoReleaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await order.save();
  }

  const vendorDoc = order ? await Vendor.findById(order.vendor) : null;
  if (vendorDoc) {
    const sellerWallet = await Wallet.findOne({ user: vendorDoc.user })
      || await Wallet.create({ user: vendorDoc.user, currency: order.currency });
    sellerWallet.pendingBalance += order.totalAmount;
    await sellerWallet.save();

    await Transaction.create({
      wallet: sellerWallet._id,
      user: vendorDoc.user,
      type: 'escrow_hold',
      amount: order.totalAmount,
      currency: order.currency,
      balance: sellerWallet.pendingBalance,
      reference: order._id.toString(),
      description: `Escrow hold for order ${order.orderNumber || order._id}`,
    });
  }

  if (order) {
    try {
      await notificationService.send({
        recipient: order.buyer,
        type: 'payment_received',
        title: 'Payment received',
        body: `Your payment for order ${order.orderNumber || order._id} was received and secured in escrow.`,
        data: { orderId: order._id.toString(), gatewayRef: paymentId, amount: payment.amount, currency: payment.currency },
        channels: ['in_app'],
      });
    } catch (err) {
      logger.error({ err, paymentId }, 'Failed to notify buyer of verified payment');
    }
  }

  return { orderAdvancedToEscrow: !!order };
}

export async function handleVerifiedWebhook({ provider, type, payload }) {
  const parsed = parseProviderPaymentEvent(provider, payload);
  if (!parsed.paymentId) return { handled: false, reason: 'no_payment_id' };
  if (!parsed.status) return { handled: false, reason: 'unhandled_event', rawStatus: parsed.rawStatus };

  const payment = await Payment.findOne({ gatewayRef: parsed.paymentId });
  if (!payment) return { handled: false, reason: 'payment_not_found' };

  // Reject verified events that contradict the order amount/currency. Never
  // release funds when the gateway amount does not match the recorded payment.
  if (payment.currency && parsed.currency
    && String(parsed.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
    logger.error({ paymentId: parsed.paymentId, expected: payment.currency, got: parsed.currency }, 'Webhook currency mismatch');
    return { handled: false, reason: 'currency_mismatch' };
  }
  if (payment.amount && !amountsMatch(payment.amount, parsed.amount)) {
    logger.error({ paymentId: parsed.paymentId, expected: payment.amount, got: parsed.amount }, 'Webhook amount mismatch');
    return { handled: false, reason: 'amount_mismatch' };
  }

  if (parsed.status === STATUS_COMPLETED) {
    if (payment.status === STATUS_COMPLETED) return { handled: true, alreadyProcessed: true, status: STATUS_COMPLETED };
    if (payment.status === STATUS_REFUNDED) return { handled: true, alreadyProcessed: true, status: STATUS_REFUNDED };

    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['pending', 'processing'] } },
      { $set: { status: STATUS_COMPLETED } },
      { new: true },
    );
    if (!claimed) return { handled: true, alreadyProcessed: true, status: STATUS_COMPLETED };

    try {
      const result = await finalizeCompleted(claimed, parsed.paymentId);
      logger.info({ paymentId: parsed.paymentId, order: String(claimed.order) }, 'Payment verified and escrow started');
      return { handled: true, status: STATUS_COMPLETED, ...result };
    } catch (err) {
      logger.error({ err, paymentId: parsed.paymentId }, 'Escrow finalisation failed after verified payment');
      claimed.status = 'pending';
      await claimed.save().catch(() => {});
      return { handled: false, reason: 'escrow_finalisation_failed' };
    }
  }

  if (parsed.status === STATUS_FAILED) {
    if (payment.status === STATUS_COMPLETED || payment.status === STATUS_REFUNDED) {
      return { handled: true, alreadyProcessed: true, status: payment.status };
    }
    payment.status = STATUS_FAILED;
    payment.gatewayResponse = { ...(payment.gatewayResponse || {}), lastWebhookEvent: parsed.rawStatus };
    await payment.save();
    logger.info({ paymentId: parsed.paymentId }, 'Payment marked failed from verified webhook');
    return { handled: true, status: STATUS_FAILED };
  }

  if (parsed.status === STATUS_REFUNDED) {
    if (payment.status === STATUS_REFUNDED || payment.status === STATUS_COMPLETED) {
      return { handled: true, alreadyProcessed: true, status: payment.status };
    }
    payment.status = STATUS_REFUNDED;
    payment.gatewayResponse = { ...(payment.gatewayResponse || {}), lastWebhookEvent: parsed.rawStatus };
    await payment.save();
    logger.info({ paymentId: parsed.paymentId }, 'Payment marked refunded from verified webhook');
    return { handled: true, status: STATUS_REFUNDED };
  }

  return { handled: false, reason: 'unhandled_event', rawStatus: parsed.rawStatus };
}