import Subscription from '../models/Subscription.js';
import { PLANS } from '../config/plans.js';

/**
 * Calculate commission for an order based on the vendor's active plan.
 * Falls back to the highest commission (Starter) if no active subscription
 * to keep the platform safe (vendor without subscription pays max).
 */
async function calculateCommission(vendorId, amount) {
  const sub = await Subscription.findActiveForUser(vendorId);
  const rate = sub?.commissionRate ?? PLANS.starter.commissionRate;
  const commission = +(amount * (rate / 100)).toFixed(2);
  const sellerPayout = +(amount - commission).toFixed(2);
  return {
    rate,
    commission,
    sellerPayout,
    planType: sub?.planType || null,
    overridden: !!sub?.adminOverride,
  };
}

export { calculateCommission };
