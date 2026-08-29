import expressAsyncHandler from 'express-async-handler';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Announcement } from '../models/announcementModel.js';

export const getBuyerAnalytics = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [totalOrders, totalSpent, recentOrders, rfqs] = await Promise.all([
    EscrowOrder.countDocuments({ buyer: userId }),
    EscrowOrder.aggregate([
      { $match: { buyer: userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    EscrowOrder.find({ buyer: userId }).sort({ createdAt: -1 }).limit(5).populate('vendor', 'storeName slug'),
    Announcement.countDocuments({ buyer: userId }),
  ]);

  const monthlySpend = await EscrowOrder.aggregate([
    { $match: { buyer: userId, status: 'completed' } },
    { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    status: true,
    data: {
      totalOrders,
      totalSpent: totalSpent[0]?.total || 0,
      rfqsPosted: rfqs,
      recentOrders,
      monthlySpend: monthlySpend.map(m => ({ month: m._id, total: m.total, count: m.count })),
    },
  });
});

export const getVendorAnalytics = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) return res.json({ status: true, data: null });

  const [totalOrders, totalRevenue, recentOrders, totalProducts] = await Promise.all([
    EscrowOrder.countDocuments({ vendor: vendor._id }),
    EscrowOrder.aggregate([
      { $match: { vendor: vendor._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    EscrowOrder.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(5),
    Product.countDocuments({ vendor: vendor._id }),
  ]);

  const monthlyRevenue = await EscrowOrder.aggregate([
    { $match: { vendor: vendor._id, status: 'completed' } },
    { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    status: true,
    data: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalProducts,
      recentOrders,
      monthlyRevenue: monthlyRevenue.map(m => ({ month: m._id, total: m.total, count: m.count })),
    },
  });
});

export const getAdminAnalytics = expressAsyncHandler(async (req, res) => {
  const [totalUsers, totalVendors, totalProducts, totalOrders, totalRevenue, ordersByStatus, usersByMonth] = await Promise.all([
    User.countDocuments(),
    Vendor.countDocuments(),
    Product.countDocuments(),
    EscrowOrder.countDocuments(),
    EscrowOrder.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    EscrowOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    status: true,
    data: {
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      ordersByStatus: ordersByStatus.reduce((acc, o) => ({ ...acc, [o._id]: o.count }), {}),
      usersByMonth: usersByMonth.map(u => ({ month: u._id, count: u.count })),
    },
  });
});

