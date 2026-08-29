import Subscription from '../models/Subscription.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import StoreEmployee from '../models/StoreEmployee.js';

export async function loadSubscription(req, _res, next) {
  try {
    if (!req.user) return next();
    if (req.user.role !== 'vendor') return next();
    req.subscription = await Subscription.findActiveForUser(req.user._id);
    next();
  } catch (err) { next(err); }
}

export function requireActiveSubscription(req, res, next) {
  if (req.user?.role !== 'vendor') return next();
  if (!req.subscription) {
    return res.status(403).json({
      status: false,
      message: 'Active subscription required. Please choose a plan to continue.',
      code: 'NO_SUBSCRIPTION',
    });
  }
  next();
}

export async function enforceProductLimit(req, res, next) {
  try {
    if (req.user?.role !== 'vendor') return next();
    if (!req.subscription) {
      return res.status(403).json({ status: false, message: 'Active subscription required to list products.' });
    }
    const limit = req.subscription.features?.maxProducts ?? 0;
    if (limit === -1) return next();
    const count = await Product.countDocuments({ vendor: req.user._id, isActive: true });
    if (count >= limit) {
      return res.status(403).json({
        status: false,
        message: `Plan limit reached (${limit} products). Upgrade to add more.`,
        code: 'PRODUCT_LIMIT_REACHED',
        upgradeUrl: '/pricing',
      });
    }
    next();
  } catch (err) { next(err); }
}

export function requireFeature(predicate, message) {
  return (req, res, next) => {
    if (req.user?.role !== 'vendor') return next();
    if (!req.subscription || !predicate(req.subscription.features)) {
      return res.status(403).json({
        status: false,
        message: message || 'Your plan does not include this feature.',
        code: 'FEATURE_NOT_AVAILABLE',
        upgradeUrl: '/pricing',
      });
    }
    next();
  };
}

export async function enforceEmployeeLimit(req, res, next) {
  try {
    if (req.user?.role !== 'vendor') return next();
    if (!req.subscription) {
      return res.status(403).json({ status: false, message: 'Active subscription required to manage employees.' });
    }
    const limit = req.subscription.features?.maxEmployees ?? 0;
    if (limit === -1) return next();
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return next();
    const count = await StoreEmployee.countDocuments({ vendor: vendor._id, status: { $ne: 'suspended' } });
    if (count >= limit) {
      return res.status(403).json({
        status: false,
        message: `Employee limit reached (${limit}). Upgrade to add more team members.`,
        code: 'EMPLOYEE_LIMIT_REACHED',
        upgradeUrl: '/pricing',
      });
    }
    next();
  } catch (err) { next(err); }
}
