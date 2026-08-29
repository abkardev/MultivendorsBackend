import { SellerCustomer } from '../models/SellerCustomer.js';
import { Lead } from '../models/Lead.js';
import { SalesGoal } from '../models/SalesGoal.js';
import { CustomerReminder } from '../models/CustomerReminder.js';
import { ProductPerformance } from '../models/ProductPerformance.js';

class SalesDashboardService {
  async getDashboard(vendorId) {
    const { default: Order } = await import('../models/Order.js');
    const { default: Quotation } = await import('../models/Quotation.js');
    const { default: User } = await import('../models/userModel.js');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const [revenueResult, ordersResult, rfqsResult, quotesResult, customers, leads,
      goals, reminders, topProducts, topCustomers] = await Promise.all([
      Order.aggregate([{ $match: { vendor: vendorId, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
      Order.countDocuments({ vendor: vendorId, createdAt: { $gte: thirtyDaysAgo } }),
      Quotation.countDocuments({ vendor: vendorId, createdAt: { $gte: thirtyDaysAgo }, source: 'rfq' }),
      Quotation.countDocuments({ vendor: vendorId, createdAt: { $gte: thirtyDaysAgo } }),
      SellerCustomer.countDocuments({ vendor: vendorId }),
      Lead.countDocuments({ vendor: vendorId, isActive: true }),
      SalesGoal.find({ vendor: vendorId, status: 'active', periodEnd: { $gte: now } }).sort({ periodEnd: 1 }),
      CustomerReminder.find({ vendor: vendorId, isCompleted: false, dueAt: { $lte: now } }).sort({ dueAt: 1 }).limit(10),
      ProductPerformance.find({ vendor: vendorId }).populate('product', 'name images price').sort({ totalRevenue: -1 }).limit(5),
      SellerCustomer.find({ vendor: vendorId }).sort({ totalRevenue: -1 }).limit(5).populate('buyer', 'name email'),
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    const orderCount = revenueResult[0]?.count || 0;
    const acceptedQuotes = await Quotation.countDocuments({ vendor: vendorId, status: 'accepted' });
    const totalQuotes = await Quotation.countDocuments({ vendor: vendorId });
    return {
      revenue: { total: totalRevenue, orders: orderCount, period: '30d' },
      orders: { total: ordersResult },
      rfqs: { total: rfqsResult },
      quotes: { total: quotesResult, accepted: acceptedQuotes, conversionRate: totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0 },
      customers: { total: customers },
      leads: { total: leads },
      goals, reminders,
      topProducts, topCustomers,
      winRate: totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0,
      averageDealSize: orderCount > 0 ? totalRevenue / orderCount : 0,
    };
  }

  async getGoals(vendorId) {
    return SalesGoal.find({ vendor: vendorId, isActive: true }).sort({ periodEnd: 1 });
  }

  async createGoal(vendorId, data) {
    return SalesGoal.create({ ...data, vendor: vendorId });
  }

  async updateGoal(vendorId, goalId, data) {
    return SalesGoal.findOneAndUpdate({ _id: goalId, vendor: vendorId }, { $set: data }, { new: true });
  }

  async deleteGoal(vendorId, goalId) {
    return SalesGoal.findOneAndUpdate({ _id: goalId, vendor: vendorId }, { isActive: false }, { new: true });
  }
}

export const salesDashboardService = new SalesDashboardService();
