import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Payment.js', () => ({
  default: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock('../models/Order.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../models/Wallet.js', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../models/Transaction.js', () => ({ default: { create: vi.fn() } }));
vi.mock('../models/vendorModel.js', () => ({ Vendor: { findById: vi.fn() } }));
vi.mock('../services/notificationService.js', () => ({
  notificationService: { send: vi.fn().mockResolvedValue({}) },
}));

function makePayment(overrides = {}) {
  return {
    _id: 'pay-1',
    order: 'order-1',
    amount: 500,
    currency: 'SAR',
    method: 'credit_card',
    status: 'pending',
    gatewayRef: 'moy-pay-1',
    gatewayResponse: {},
    save: vi.fn().mockResolvedValue(),
    ...overrides,
  };
}

function makeOrder() {
  return {
    _id: 'order-1',
    buyer: 'buyer-1',
    vendor: 'vendor-1',
    status: 'awaiting_payment',
    totalAmount: 500,
    currency: 'SAR',
    orderNumber: 'ORD-1',
    save: vi.fn().mockResolvedValue(),
  };
}

describe('paymentWebhookHandler — verified webhook state machine', () => {
  let handler;
  let Payment;
  let Order;
  let Wallet;
  let Transaction;
  let Vendor;
  let notificationService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    handler = await import('../services/payment/paymentWebhookHandler.js');
    Payment = (await import('../models/Payment.js')).default;
    Order = (await import('../models/Order.js')).default;
    Wallet = (await import('../models/Wallet.js')).default;
    Transaction = (await import('../models/Transaction.js')).default;
    Vendor = (await import('../models/vendorModel.js')).Vendor;
    notificationService = (await import('../services/notificationService.js')).notificationService;
  });

  it('completes the Payment and moves the order into escrow only from a verified Moyasar "paid" event', async () => {
    const payment = makePayment();
    const claimed = makePayment({ status: 'completed' });
    const order = makeOrder();
    const wallet = { _id: 'wallet-1', user: 'vendor-user-1', currency: 'SAR', pendingBalance: 0, save: vi.fn().mockResolvedValue() };

    Payment.findOne.mockResolvedValue(payment);
    Payment.findOneAndUpdate.mockResolvedValue(claimed);
    Order.findById.mockResolvedValue(order);
    Vendor.findById.mockResolvedValue({ user: 'vendor-user-1' });
    Wallet.findOne.mockResolvedValue(wallet);

    const payload = {
      id: 'evt_1',
      type: 'payment_status',
      status: { id: 'moy-pay-1', status: 'paid', amount: 50000, currency: 'SAR' },
    };

    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });

    expect(result.handled).toBe(true);
    expect(result.status).toBe('completed');
    expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'pay-1', status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'completed' } },
      expect.anything(),
    );
    expect(order.status).toBe('in_escrow');
    expect(order.paymentId).toBe('pay-1');
    expect(order.autoReleaseDate).toBeInstanceOf(Date);
    expect(wallet.pendingBalance).toBe(500);
    expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'escrow_hold', amount: 500 }));
    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'payment_received' }));
  });

  it('does NOT complete the payment for a verified event when the amount mismatches the order', async () => {
    const payment = makePayment();
    Payment.findOne.mockResolvedValue(payment);

    const payload = {
      id: 'evt_2',
      type: 'payment_status',
      status: { id: 'moy-pay-1', status: 'paid', amount: 999999, currency: 'SAR' },
    };

    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });

    expect(result.handled).toBe(false);
    expect(result.reason).toBe('amount_mismatch');
    expect(Payment.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Order.findById).not.toHaveBeenCalled();
    expect(Vendor.findById).not.toHaveBeenCalled();
  });

  it('does NOT complete the payment when the verified currency mismatches', async () => {
    const payment = makePayment();
    Payment.findOne.mockResolvedValue(payment);

    const payload = {
      id: 'evt_3',
      type: 'payment_status',
      status: { id: 'moy-pay-1', status: 'paid', amount: 50000, currency: 'USD' },
    };

    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });
    expect(result.handled).toBe(false);
    expect(result.reason).toBe('currency_mismatch');
    expect(Payment.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('is idempotent: a second "paid" event for an already-completed payment does not re-credit the wallet', async () => {
    Payment.findOne.mockResolvedValue(makePayment({ status: 'completed' }));
    Payment.findOneAndUpdate.mockResolvedValue(null);

    const payload = { id: 'evt_4', type: 'payment_status', status: { id: 'moy-pay-1', status: 'paid', amount: 50000, currency: 'SAR' } };
    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });

    expect(result.handled).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    expect(Order.findById).not.toHaveBeenCalled();
    expect(Wallet.findOne).not.toHaveBeenCalled();
  });

  it('marks a verified "failed" event as failed (no escrow transition)', async () => {
    const payment = makePayment();
    Payment.findOne.mockResolvedValue(payment);

    const payload = { id: 'evt_5', type: 'payment_status', status: { id: 'moy-pay-1', status: 'failed', amount: 50000, currency: 'SAR' } };
    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });

    expect(result.handled).toBe(true);
    expect(result.status).toBe('failed');
    expect(payment.status).toBe('failed');
    expect(payment.save).toHaveBeenCalled();
    expect(Order.findById).not.toHaveBeenCalled();
  });

  it('fails safely when the verified event references an unknown payment ID', async () => {
    Payment.findOne.mockResolvedValue(null);
    const payload = { id: 'evt_6', type: 'payment_status', status: { id: 'unknown', status: 'paid', amount: 50000, currency: 'SAR' } };
    const result = await handler.handleVerifiedWebhook({ provider: 'moyasar', type: 'payment_status', payload });
    expect(result.handled).toBe(false);
    expect(result.reason).toBe('payment_not_found');
  });

  it('parses a signed-esque HyperPay notification into a completed payment event', () => {
    const payload = {
      notification: {
        resource: { path: '/v1/payments/7e6d4f1a-2b3c', type: 'payment' },
        result: { code: '000.100.110', description: 'Request successfully processed' },
        amount: { amount: '500.00', currency: 'SAR' },
      },
    };
    const parsed = handler.parseProviderPaymentEvent('hyperpay', payload);
    expect(parsed.paymentId).toBe('7e6d4f1a-2b3c');
    expect(parsed.status).toBe('completed');
    expect(Number(parsed.amount)).toBe(500);
  });

  it('parses HyperPay rejection codes as failed', () => {
    const payload = {
      notification: {
        resource: { path: '/v1/payments/abc123' },
        result: { code: '000.200.100' },
      },
    };
    expect(handler.parseProviderPaymentEvent('hyperpay', payload).status).toBe('failed');
  });

  it('parses Adyen and PayPal capture events as completed', () => {
    const adyen = {
      notificationItems: [{ NotificationRequestItem: { pspReference: 'ady-1', eventCode: 'AUTHORISATION', success: 'true', amount: { value: 50000, currency: 'SAR' } } }],
    };
    expect(handler.parseProviderPaymentEvent('adyen', adyen).status).toBe('completed');

    const paypal = { id: 'evt_pp', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'cap-1', amount: { value: '500.00', currency_code: 'SAR' } } };
    expect(handler.parseProviderPaymentEvent('paypal', paypal).status).toBe('completed');
  });
});