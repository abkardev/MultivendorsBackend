import FeatureFlag from '../models/FeatureFlag.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

const cache = new Map();
const CACHE_TTL = 60000; // 1 minute
let lastFetch = 0;

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(featureKey, context = {}) {
  const flags = await getAllFlags();
  const flag = flags.find(f => f.key === featureKey);
  
  if (!flag) return true; // Default to enabled for unknown features
  
  // Force overrides
  if (flag.forceEnabled) return true;
  if (flag.forceDisabled) return false;
  
  // Check global disable
  if (!flag.enabled) return false;
  
  // Check deny list
  if (context.userId && flag.denyList?.some(id => id.toString() === context.userId.toString())) {
    return false;
  }
  
  // Check allow list
  if (context.userId && flag.allowList?.some(id => id.toString() === context.userId.toString())) {
    return true;
  }
  
  // Check percentage rollout
  if (flag.percentage < 100 && context.userId) {
    const hash = hashUserId(context.userId.toString(), featureKey);
    if (hash > flag.percentage) return false;
  }
  
  // Check scope
  if (flag.scope === 'environment' && flag.scopeValue !== (process.env.NODE_ENV || 'development')) {
    return false;
  }
  
  if (flag.scope === 'country' && context.country && flag.scopeValue !== context.country) {
    return false;
  }
  
  if (flag.scope === 'subscription' && context.subscription && flag.scopeValue !== context.subscription) {
    return false;
  }
  
  return true;
}

/**
 * Get all feature flags with caching
 */
export async function getAllFlags() {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && cache.size > 0) {
    return Array.from(cache.values());
  }
  
  try {
    const flags = await FeatureFlag.find().lean();
    cache.clear();
    flags.forEach(f => cache.set(f.key, f));
    lastFetch = now;
    return flags;
  } catch (err) {
    logger.error('Failed to fetch feature flags', err);
    return Array.from(cache.values());
  }
}

/**
 * Enable/disable a feature flag
 */
export async function setFeatureFlag(key, enabled, userId) {
  const flag = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: { enabled, updatedBy: userId, changedAt: new Date() } },
    { new: true }
  );
  
  if (flag) {
    cache.set(key, flag);
  }
  
  return flag;
}

/**
 * Create or update a feature flag
 */
export async function upsertFeatureFlag(data, userId) {
  const flag = await FeatureFlag.findOneAndUpdate(
    { key: data.key },
    { $set: { ...data, updatedBy: userId, changedAt: new Date() } },
    { upsert: true, new: true }
  );
  
  cache.set(flag.key, flag);
  return flag;
}

/**
 * Middleware to check if a feature is enabled
 */
export function featureFlag(featureKey) {
  return async (req, res, next) => {
    const enabled = await isFeatureEnabled(featureKey, {
      userId: req.user?._id,
      country: req.headers['x-country'],
      subscription: req.user?.subscriptionPlan,
    });
    
    if (!enabled) {
      return res.status(404).json({ status: false, message: 'This feature is not available' });
    }
    
    next();
  };
}

function hashUserId(userId, featureKey) {
  let hash = 0;
  const str = userId + featureKey;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}
