import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import AgentSession from '../models/AgentSession.js';

class ContextEngine {
  async collectContext(userId, sessionId) {
    const session = sessionId ? await AgentSession.findById(sessionId).lean() : null;

    const [orders, vendors, favorites] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').limit(20).lean(),
      Vendor.find({ status: 'active' }).limit(20).lean(),
      this.getFavoriteVendors(userId),
    ]);

    const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrderValue = orders.length > 0 ? Math.round(totalSpend / orders.length) : 0;
    const uniqueVendors = new Set(orders.map(o => o.vendor?.toString()).filter(Boolean));

    return {
      user: { userId },
      orders: { count: orders.length, totalSpend, avgOrderValue, uniqueSupplierCount: uniqueVendors.size },
      vendors: vendors.length,
      favoriteSuppliers: favorites.length,
      recentCategories: [...new Set(orders.flatMap(o => o.items?.map(i => i.category).filter(Boolean) || []))],
      sessionContext: session ? { objective: session.businessObjective, status: session.status, recommendations: session.recommendations } : null,
      timestamp: new Date(),
    };
  }

  async getFavoriteVendors(userId) {
    try {
      const FavoriteSupplier = (await import('../models/FavoriteSupplier.js')).default;
      return await FavoriteSupplier.find({ user: userId }).lean();
    } catch { return []; }
  }
}

export default new ContextEngine();
