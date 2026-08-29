import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../models/Order.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../models/Payment.js', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../models/Wallet.js', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../models/Transaction.js', () => ({ default: { create: vi.fn() } }));
vi.mock('../models/Dispute.js', () => ({ default: { create: vi.fn() } }));
vi.mock('../models/vendorModel.js', () => ({ Vendor: { findById: vi.fn(), findOne: vi.fn() } }));
vi.mock('../models/WithdrawalRequest.js', () => ({ default: { create: vi.fn() } }));
vi.mock('../services/payment/PaymentOrchestrator.js', () => ({
  paymentOrchestrator: { createPayment: vi.fn() },
}));

const orderId = 'order-1';
const userId = 'buyer-1';

function makeOrder() {
  return {
    _id: orderId,
    buyer: { toString: () => userId },
    vendor: 'vendor-1',
    status: 'awaiting_payment',
    totalAmount: 500,
    currency: 'SAR',
    orderNumber: 'ORD-1',
    save: vi.fn().mockResolvedValue(),
  };
}

function makeRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res;
}

async function loadController(env) {
  vi.resetModules();
  process.env.NODE_ENV = env.n;
  if (env.mode) process.env.PAYMENT_MODE = env.mode;
  else delete process.env.PAYMENT_MODE;
  const mod = await import('../controllers/escrowController.js');
  return mod;
}

describe('escrow createPayment — simulation guard', () => {
  let mongo;
  let orchestrator;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.PAYMENT_MODE;
    mongo = {
      order: (await import('../models/Order.js')).default,
      payment: (await import('../models/Payment.js')).default,
    };
    orchestrator = (await import('../services/payment/PaymentOrchestrator.js')).paymentOrchestrator;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.PAYMENT_MODE;
  });

  it('NEVER completes a payment in production when the gateway is unavailable', async () => {
    const ctrl = await loadController({ n: 'production', mode: 'live' });
    mongo.order.findById.mockResolvedValue(makeOrder());
    mongo.payment.findOne.mockResolvedValue(null);
    const uncompleted = { status: 'pending', gatewayRef: null, save: vi.fn().mockResolvedValue() };
    mongo.payment.create.mockResolvedValue(uncompleted);
    orchestrator.createPayment.mockRejectedValue(new Error('gateway down'));

    const req = { body: { orderId, method: 'credit_card' }, user: { _id: userId } };
    const res = makeRes();
    await ctrl.createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(uncompleted.status).not.toBe('completed');
    expect(String(uncompleted.gatewayRef)).not.toMatch(/^sim_/);
  });

  it('rejects unsupported methods in live mode', async () => {
    const ctrl = await loadController({ n: 'production', mode: 'live' });
    mongo.order.findById.mockResolvedValue(makeOrder());
    mongo.payment.findOne.mockResolvedValue(null);
    const pending = { status: 'pending', save: vi.fn() };
    mongo.payment.create.mockResolvedValue(pending);

    const req = { body: { orderId, method: 'bitcoin' }, user: { _id: userId } };
    const res = makeRes();
    await ctrl.createPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(orchestrator.createPayment).not.toHaveBeenCalled();
  });

  it('keeps bank_transfer as manually-verified processing', async () => {
    const ctrl = await loadController({ n: 'production' });
    mongo.order.findById.mockResolvedValue(makeOrder());
    mongo.payment.findOne.mockResolvedValue(null);
    const payment = { status: 'pending', save: vi.fn().mockResolvedValue() };
    mongo.payment.create.mockResolvedValue(payment);

    const req = { body: { orderId, method: 'bank_transfer' }, user: { _id: userId } };
    const res = makeRes();
    await ctrl.createPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(payment.status).toBe('processing');
    expect(orchestrator.createPayment).not.toHaveBeenCalled();
  });

  it('allows simulation ONLY outside production with PAYMENT_MODE=test', async () => {
    const ctrl = await loadController({ n: 'development', mode: 'test' });
    const order = makeOrder();
    mongo.order.findById.mockResolvedValue(order);
    mongo.payment.findOne.mockResolvedValue(null);
    const payment = { status: 'pending', save: vi.fn().mockResolvedValue() };
    mongo.payment.create.mockResolvedValue(payment);

    const req = { body: { orderId, method: 'credit_card' }, user: { _id: userId } };
    const res = makeRes();
    await ctrl.createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(payment.status).toBe('completed');
    expect(String(payment.gatewayRef)).toMatch(/^sim_/);
    expect(order.save).toHaveBeenCalled();
    expect(order.status).toBe('in_escrow');
  });
});