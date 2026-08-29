import { Router } from 'express';
import mongoose from 'mongoose';
import { getLogger } from '../services/logger.js';
import { protect } from '../middlewares/authMiddleware.js';
import { metricsCollector } from '../services/metrics.js';

const router = Router();

router.use(protect);

router.get('/admin/analytics/daily-orders', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await mongoose.model('Order').aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: true, data: orders });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/daily-payments', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const payments = await mongoose.model('Payment').aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: true, data: payments });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/marketplace-summary', async (req, res) => {
  try {
    const [
      totalOrders, totalPayments, totalUsers, totalVendors,
      pendingEscrows, completedShipments, totalRefunds, totalWithdrawals
    ] = await Promise.all([
      mongoose.model('Order').countDocuments(),
      mongoose.model('Payment').countDocuments({ status: 'completed' }),
      mongoose.model('User').countDocuments({ role: 'buyer' }),
      mongoose.model('Vendor').countDocuments({ isVerified: true }),
      mongoose.model('Escrow')?.countDocuments({ status: 'held' }) || Promise.resolve(0),
      mongoose.model('Shipment')?.countDocuments({ status: 'delivered' }) || Promise.resolve(0),
      mongoose.model('Transaction')?.countDocuments({ type: 'refund' }) || Promise.resolve(0),
      mongoose.model('WithdrawalRequest')?.countDocuments({ status: 'completed' }) || Promise.resolve(0),
    ]);
    res.json({ status: true, data: { totalOrders, totalPayments, totalUsers, totalVendors, pendingEscrows, completedShipments, totalRefunds, totalWithdrawals } });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/top-vendors', async (req, res) => {
  try {
    const vendors = await mongoose.model('Order').aggregate([
      { $group: { _id: '$vendor', orderCount: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      { $project: { storeName: '$vendor.storeName', orderCount: 1, totalRevenue: 1 } },
    ]);
    res.json({ status: true, data: vendors });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/top-buyers', async (req, res) => {
  try {
    const buyers = await mongoose.model('Order').aggregate([
      { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', email: '$user.email', orderCount: 1, totalSpent: 1 } },
    ]);
    res.json({ status: true, data: buyers });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/system-metrics', async (req, res) => {
  const metrics = metricsCollector.getSnapshot();
  res.json({ status: true, data: metrics });
});

router.get('/admin/analytics/error-trends', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const errors = await mongoose.model('AuditLog').aggregate([
      { $match: { status: 'failure', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, category: { $addToSet: '$category' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: true, data: errors });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/admin/analytics/ai-usage', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usage = await mongoose.model('MarketplaceEvent').aggregate([
      { $match: { source: 'ai', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: true, data: usage });
  } catch (err) {
    res.json({ status: true, data: [] });
  }
});

export default router;
