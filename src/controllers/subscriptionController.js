import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

import Subscription from '../models/Subscription.js';
import { PLANS } from '../config/plans.js';

let _stripe = null;
function getStripe() {
  if (_stripe !== null) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) { _stripe = false; return null; }
  const Stripe = _require('stripe');
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/subscription/me
export const getMine = async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.json({ status: true, data: null });
    }
    const sub = await Subscription.findActiveForUser(req.user._id);
    res.json({ status: true, data: sub });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/subscription/checkout  { planType }
export const createCheckout = async (req, res) => {
  try {
    const { planType } = req.body;
    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ status: false, message: 'Invalid plan' });
    if (!plan.stripePriceId) {
      return res.status(500).json({ status: false, message: `STRIPE_PRICE_${planType.toUpperCase()} env var not configured` });
    }
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ status: false, message: 'Only vendors can subscribe' });
    }
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ status: false, message: 'Stripe not configured' });

    // Reuse existing Stripe customer if any
    let customerId;
    const existing = await Subscription.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (existing?.stripeCustomerId) customerId = existing.stripeCustomerId;
    else {
      const cust = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: { userId: String(req.user._id) },
      });
      customerId = cust.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/pricing`,
      metadata: { userId: String(req.user._id), planType },
      subscription_data: { metadata: { userId: String(req.user._id), planType } },
    });

    res.json({ status: true, data: { checkoutUrl: session.url, sessionId: session.id } });
  } catch (err) {
    console.error('createCheckout error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/subscription/cancel  -> turn off auto-renew (Stripe cancel_at_period_end)
export const cancel = async (req, res) => {
  try {
    const sub = await Subscription.findActiveForUser(req.user._id);
    if (!sub) return res.status(404).json({ status: false, message: 'No active subscription' });
    if (sub.stripeSubscriptionId) {
      const stripe = getStripe();
      if (stripe) {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      }
    }
    sub.autoRenew = false;
    sub.canceledAt = new Date();
    await sub.save();
    res.json({ status: true, data: sub });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/subscription/change-plan { planType } -> create new checkout session for upgrade/downgrade
export const changePlan = async (req, res) => {
  // For simplicity, redirect through Stripe Customer Portal or a fresh checkout.
  // Production: use stripe.subscriptions.update with proration_behavior='always_invoice'.
  return createCheckout(req, res);
};

// === ADMIN ===

// GET /api/admin/subscriptions
export const adminList = async (_req, res) => {
  try {
    const subs = await Subscription.find().populate('userId', 'name email role').sort({ createdAt: -1 }).limit(500);
    res.json({ status: true, data: subs });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/admin/subscriptions/assign { vendorId, planType, commissionOverride? }
export const adminAssign = async (req, res) => {
  try {
    const { vendorId, planType, commissionOverride } = req.body;
    const plan = PLANS[planType];
    if (!plan) return res.status(400).json({ status: false, message: 'Invalid plan' });

    // Expire any current active sub
    await Subscription.updateMany(
      { userId: vendorId, status: 'active' },
      { status: 'canceled', canceledAt: new Date() }
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const sub = await Subscription.create({
      userId: vendorId,
      planType,
      status: 'active',
      startDate,
      endDate,
      commissionRate: commissionOverride ?? plan.commissionRate,
      features: plan.features,
      autoRenew: false, // admin-assigned plans are manual
      adminOverride: commissionOverride != null,
    });

    res.json({ status: true, data: sub });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// GET /api/admin/subscriptions/analytics
export const adminAnalytics = async (_req, res) => {
  try {
    const all = await Subscription.find();
    const active = all.filter((s) => s.status === 'active');
    const byPlan = { starter: 0, growth: 0, pro: 0 };
    let monthlyRevenue = 0;
    for (const s of active) {
      byPlan[s.planType] = (byPlan[s.planType] || 0) + 1;
      monthlyRevenue += (PLANS[s.planType]?.price || 0) / 12;
    }
    const canceledLast30 = all.filter(
      (s) => s.canceledAt && s.canceledAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const churnRate = active.length === 0 ? 0 : (canceledLast30 / active.length) * 100;

    res.json({
      status: true,
      data: {
        totalSubscribers: active.length,
        byPlan,
        monthlyRevenue: Math.round(monthlyRevenue),
        churnRate: +churnRate.toFixed(1),
        upgrades: 0, // wire up real upgrade tracking if needed
        downgrades: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
