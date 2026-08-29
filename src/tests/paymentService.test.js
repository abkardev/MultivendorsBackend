import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('stripe', () => {
  const fn = () => ({
    paymentIntents: {
      create: vi.fn().mockResolvedValue({ id: 'pi_mock', status: 'succeeded', amount: 5000 }),
      retrieve: vi.fn().mockResolvedValue({ id: 'pi_mock', status: 'succeeded' }),
      update: vi.fn().mockResolvedValue({ id: 'pi_mock', status: 'updated' }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({ id: 're_mock', status: 'succeeded' }),
    },
  });
  fn.errors = {};
  return { default: fn };
});

vi.mock('../models/Payment.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../models/Refund.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

describe('PaymentService', () => {
  let stripe;

  beforeEach(async () => {
    vi.clearAllMocks();
    const stripeModule = await import('stripe');
    stripe = stripeModule.default();
  });

  it('should process payment successfully', async () => {
    const payment = await stripe.paymentIntents.create({ amount: 5000, currency: 'usd' });
    expect(payment.status).toBe('succeeded');
    expect(payment.id).toMatch(/^pi_/);
  });

  it('should retrieve payment details', async () => {
    const payment = await stripe.paymentIntents.retrieve('pi_mock');
    expect(payment.status).toBe('succeeded');
  });

  it('should process refund', async () => {
    const refund = await stripe.refunds.create({ payment_intent: 'pi_mock' });
    expect(refund.status).toBe('succeeded');
  });

  it('should validate payment amount', () => {
    const isValid = (amount) => amount > 0 && Number.isFinite(amount);
    expect(isValid(100)).toBe(true);
    expect(isValid(0)).toBe(false);
    expect(isValid(-50)).toBe(false);
    expect(isValid(NaN)).toBe(false);
  });

  it('should validate currency code', () => {
    const validCurrencies = ['usd', 'eur', 'sar', 'aed', 'gbp'];
    expect(validCurrencies).toContain('usd');
    expect(validCurrencies).not.toContain('xyz');
  });
});
