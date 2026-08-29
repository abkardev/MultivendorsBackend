import mongoose from 'mongoose';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import Review from '../models/reviewModel.js';
import { Announcement } from '../models/announcementModel.js';
import { BuyingRequest } from '../models/buyingRequestModel.js';
import { Quotation } from '../models/Quotation.js';
import { Negotiation } from '../models/Negotiation.js';
import { Invoice } from '../models/Invoice.js';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import { ComplianceVerification } from '../models/ComplianceVerification.js';
import { ModerationQueue } from '../models/ModerationQueue.js';
import { Lead } from '../models/Lead.js';
import { Support } from '../models/supportSchema.js';
import Dispute from '../models/Dispute.js';
import { logAuditEvent } from './auditService.js';

const copilotSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'buyer', 'supplier', 'executive', 'finance', 'compliance', 'sales', 'support', 'moderator', 'operations'], required: true },
  title: { type: String, default: 'Copilot Session' },
  isActive: { type: Boolean, default: true },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

copilotSessionSchema.index({ userId: 1, role: 1, isActive: 1, createdAt: -1 });

const CopilotSession = mongoose.models.CopilotSession || mongoose.model('CopilotSession', copilotSessionSchema);

class AiCopilotService {
  constructor() {
    this.intentPatterns = {
      metrics: /metrics|dashboard|overview|summary|stats|performance/i,
      orders: /order|purchase|buy|transaction|sales/i,
      revenue: /revenue|income|earnings|profit|financial/i,
      products: /product|inventory|stock|item|goods/i,
      suppliers: /supplier|vendor|seller|provider/i,
      compliance: /compliance|verif|certify|badge|approv/i,
      moderation: /moderat|flag|review|queue|report/i,
      support: /support|ticket|help|issue|complaint/i,
      leads: /lead|customer|prospect|opportunity/i,
      forecasts: /forecast|predict|trend|projection|growth/i,
      disputes: /dispute|resolution|conflict|claim/i,
      health: /health|status|system|uptime|job|queue/i,
    };
  }

  _detectIntent(content) {
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(content)) return intent;
    }
    return 'general';
  }

  _routeToCopilot(intent, role) {
    const router = {
      metrics: 'admin', dashboard: 'admin', overview: 'admin',
      orders: 'buyer', purchase: 'buyer',
      revenue: 'finance', income: 'finance',
      products: 'supplier', inventory: 'supplier',
      suppliers: 'supplier', vendor: 'supplier',
      compliance: 'compliance', verif: 'compliance',
      moderation: 'moderator', flag: 'moderator',
      support: 'support', ticket: 'support',
      leads: 'sales', customer: 'sales',
      forecasts: 'executive', growth: 'executive',
      disputes: 'operations', resolution: 'operations',
      health: 'operations', system: 'operations',
    };
    for (const [key, mappedRole] of Object.entries(router)) {
      if (intent === key || intent.includes(key)) return mappedRole;
    }
    return role;
  }

  async createSession(userId, role, title) {
    const session = await CopilotSession.create({ userId, role, title, messages: [{ role: 'system', content: `Copilot session started for ${role}` }] });
    await logAuditEvent({ userId, action: 'create_copilot_session', category: 'ai', entityType: 'CopilotSession', entityId: session._id, description: `Created ${role} copilot session: ${title}` });
    return { sessionId: session._id, role, title, createdAt: session.createdAt };
  }

  async getSessions(userId, role) {
    const filter = { userId, isActive: true };
    if (role) filter.role = role;
    const sessions = await CopilotSession.find(filter).sort({ createdAt: -1 }).select('title role createdAt updatedAt').lean();
    return sessions;
  }

  async getSession(sessionId) {
    const session = await CopilotSession.findById(sessionId).lean();
    if (!session) throw new Error('Session not found');
    return session;
  }

  async sendMessage(sessionId, content, userId) {
    const session = await CopilotSession.findById(sessionId);
    if (!session) throw new Error('Session not found');

    session.messages.push({ role: 'user', content, metadata: { userId }, createdAt: new Date() });

    const intent = this._detectIntent(content);
    const copilotRole = this._routeToCopilot(intent, session.role);
    const handler = this[`_handle${copilotRole.charAt(0).toUpperCase() + copilotRole.slice(1)}Copilot`]?.bind(this);

    let response;
    if (handler) {
      response = await handler(content, userId);
    } else {
      response = await this._handleGeneralQuery(content, userId);
    }

    const assistantMessage = {
      role: 'assistant',
      content: response.answer,
      metadata: { intent, copilotRole, confidence: response.confidence, evidence: response.evidence, suggestedActions: response.suggestedActions, relatedEntities: response.relatedEntities },
      createdAt: new Date(),
    };

    session.messages.push(assistantMessage);
    session.context = { ...session.context, lastIntent: intent, lastCopilotRole: copilotRole };
    await session.save();

    return {
      answer: response.answer,
      confidence: response.confidence,
      evidence: response.evidence || [],
      suggestedActions: response.suggestedActions || [],
      relatedEntities: response.relatedEntities || [],
      copilotRole,
      intent,
    };
  }

  async getConversationHistory(sessionId, page = 1, limit = 50) {
    const session = await CopilotSession.findById(sessionId).select('messages').lean();
    if (!session) throw new Error('Session not found');
    const start = (page - 1) * limit;
    const messages = session.messages.slice(start, start + limit);
    return { messages, total: session.messages.length, page, totalPages: Math.ceil(session.messages.length / limit) };
  }

  async clearSession(sessionId) {
    await CopilotSession.findByIdAndUpdate(sessionId, { isActive: false });
    return { success: true };
  }

  async executeAction(sessionId, actionType, params) {
    const session = await CopilotSession.findById(sessionId);
    if (!session) throw new Error('Session not found');
    session.messages.push({ role: 'system', content: `Action executed: ${actionType}`, metadata: { actionType, params } });
    await session.save();
    return { success: true, actionType, executedAt: new Date().toISOString() };
  }

  async getCopilotInsights(role) {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (role) {
      case 'admin': {
        const [userCount, orderCount, productCount, vendorCount, revenue] = await Promise.all([
          User.countDocuments({ isActive: true }),
          Order.countDocuments({ createdAt: { $gte: last30 } }),
          Product.countDocuments({}),
          Vendor.countDocuments({ isActive: true }),
          MarketplaceRevenue.aggregate([{ $match: { createdAt: { $gte: last30 }, status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        ]);
        return { metrics: { activeUsers: userCount, orders30d: orderCount, products: productCount, vendors: vendorCount, revenue30d: revenue[0]?.total || 0 }, generatedAt: now.toISOString() };
      }
      case 'buyer': {
        const [openRfqs, activeOrders, quotations] = await Promise.all([
          Announcement.countDocuments({ status: 'open' }),
          EscrowOrder.countDocuments({ status: { $in: ['in_escrow', 'shipped'] } }),
          Quotation.countDocuments({ status: 'pending' }),
        ]);
        return { metrics: { openRfqs, activeOrders, pendingQuotations: quotations }, generatedAt: now.toISOString() };
      }
      case 'supplier': {
        const [totalProducts, totalLeads, quotationsSent] = await Promise.all([
          Product.countDocuments({}),
          Lead.countDocuments({ stage: { $ne: 'lost' } }),
          Quotation.countDocuments({ status: 'sent' }),
        ]);
        return { metrics: { totalProducts, activeLeads: totalLeads, quotationsSent }, generatedAt: now.toISOString() };
      }
      case 'executive': {
        const [totalRevenue, totalOrders, activeVendors, totalUsers] = await Promise.all([
          MarketplaceRevenue.aggregate([{ $match: { status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
          EscrowOrder.countDocuments({}),
          Vendor.countDocuments({ isActive: true }),
          User.countDocuments({ isActive: true }),
        ]);
        return { metrics: { totalRevenue: totalRevenue[0]?.total || 0, totalOrders, activeVendors, totalUsers }, generatedAt: now.toISOString() };
      }
      case 'finance': {
        const [pendingInvoices, overdueInvoices, revenueByType] = await Promise.all([
          Invoice.countDocuments({ status: 'sent' }),
          Invoice.countDocuments({ status: 'overdue' }),
          MarketplaceRevenue.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]),
        ]);
        return { metrics: { pendingInvoices, overdueInvoices, revenueBreakdown: revenueByType }, generatedAt: now.toISOString() };
      }
      case 'compliance': {
        const [pendingVerifications, verifiedCount, highRiskCount] = await Promise.all([
          ComplianceVerification.countDocuments({ status: 'pending_review' }),
          ComplianceVerification.countDocuments({ status: 'verified' }),
          ComplianceVerification.countDocuments({ riskLevel: 'high' }),
        ]);
        return { metrics: { pendingVerifications, verifiedCount, highRiskCount }, generatedAt: now.toISOString() };
      }
      case 'sales': {
        const [wonLeads, totalLeads, pipelineValue] = await Promise.all([
          Lead.countDocuments({ stage: 'won' }),
          Lead.countDocuments({ isActive: true }),
          Lead.aggregate([{ $match: { stage: { $in: ['negotiating', 'waiting'] } } }, { $group: { _id: null, total: { $sum: '$estimatedValue' } } }]),
        ]);
        return { metrics: { wonLeads, activeLeads: totalLeads, pipelineValue: pipelineValue[0]?.total || 0 }, generatedAt: now.toISOString() };
      }
      case 'support': {
        const [openTickets, inProgressTickets, avgResolutionTime] = await Promise.all([
          Support.countDocuments({ status: 'open' }),
          Support.countDocuments({ status: 'in_progress' }),
          Support.aggregate([{ $match: { status: 'closed' } }, { $group: { _id: null, avgTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } }]),
        ]);
        return { metrics: { openTickets, inProgress: inProgressTickets, avgResolutionHours: avgResolutionTime[0] ? Math.round(avgResolutionTime[0].avgTime / 3600000) : 0 }, generatedAt: now.toISOString() };
      }
      case 'moderator': {
        const pendingQueue = await ModerationQueue.countDocuments({ status: 'pending' });
        const flaggedContent = await ModerationQueue.countDocuments({ status: 'in_review' });
        return { metrics: { pendingQueue, inReview: flaggedContent }, generatedAt: now.toISOString() };
      }
      case 'operations': {
        const [activeDisputes, pendingOrders, shippedOrders] = await Promise.all([
          Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
          EscrowOrder.countDocuments({ status: 'pending' }),
          EscrowOrder.countDocuments({ shipmentStatus: 'shipped' }),
        ]);
        return { metrics: { activeDisputes, pendingOrders, shippedOrders }, generatedAt: now.toISOString() };
      }
      default:
        return { metrics: {}, generatedAt: now.toISOString() };
    }
  }

  async _handleAdminCopilot(query, userId) {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, totalVendors, totalProducts, totalOrders, totalRevenue, pendingModeration, recentUsers] = await Promise.all([
      User.countDocuments({}),
      Vendor.countDocuments({}),
      Product.countDocuments({}),
      EscrowOrder.countDocuments({}),
      MarketplaceRevenue.aggregate([{ $match: { status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ModerationQueue.countDocuments({ status: 'pending' }),
      User.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
    ]);
    const orders30d = await EscrowOrder.countDocuments({ createdAt: { $gte: last30 } });
    const revenue30d = await MarketplaceRevenue.aggregate([{ $match: { createdAt: { $gte: last30 }, status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);

    return {
      answer: `**Platform Overview**\n- **Users:** ${totalUsers} total (${recentUsers.length} recent)\n- **Vendors:** ${totalVendors} active\n- **Products:** ${totalProducts} listed\n- **Orders:** ${totalOrders} (${orders30d} in last 30 days)\n- **Revenue:** $${(totalRevenue[0]?.total || 0).toLocaleString()} total ($${(revenue30d[0]?.total || 0).toLocaleString()} last 30d)\n- **Moderation Queue:** ${pendingModeration} items pending`,
      confidence: 0.92,
      evidence: [`${totalUsers} active users`, `${totalOrders} orders placed`, `$${(totalRevenue[0]?.total || 0).toLocaleString()} total revenue`],
      suggestedActions: ['View detailed user analytics', 'Review moderation queue', 'Generate revenue report'],
      relatedEntities: ['User', 'Vendor', 'EscrowOrder', 'MarketplaceRevenue'],
    };
  }

  async _handleBuyerCopilot(query, userId) {
    const [orders, rfqs, quotations, buyingRequests, recentProducts] = await Promise.all([
      EscrowOrder.find({ buyer: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Announcement.find({ buyer: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Quotation.find({ buyer: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      BuyingRequest.find({ buyer: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Product.find({}).sort({ ratingAverage: -1 }).limit(5).select('name.en ratingAverage priceBreaks').lean(),
    ]);
    const activeOrders = orders.filter(o => ['pending', 'in_escrow', 'shipped'].includes(o.status));

    return {
      answer: `**Your Marketplace Summary**\n- **Orders:** ${orders.length} total (${activeOrders.length} active)\n- **RFQs Posted:** ${rfqs.length}\n- **Quotations Received:** ${quotations.length}\n- **Buying Requests:** ${buyingRequests.length}\n\n**Top Rated Products You May Like:**\n${recentProducts.map(p => `- ${p.name?.en || 'Product'} (${p.ratingAverage || 'N/A'}★)`).join('\n')}`,
      confidence: 0.88,
      evidence: [`${activeOrders.length} active orders`, `${rfqs.length} RFQs posted`],
      suggestedActions: ['Track active orders', 'Post new RFQ', 'Explore top-rated products', 'Review quotations'],
      relatedEntities: ['EscrowOrder', 'Announcement', 'Quotation'],
    };
  }

  async _handleSupplierCopilot(query, userId) {
    const vendor = await Vendor.findOne({ user: userId }).lean();
    if (!vendor) return { answer: 'Vendor profile not found.', confidence: 0, evidence: [], suggestedActions: ['Complete vendor registration'], relatedEntities: [] };

    const [products, orders, quotations, reviews, leads] = await Promise.all([
      Product.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(10).lean(),
      EscrowOrder.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Quotation.find({ vendor: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Review.find({ vendor: vendor._id }).sort({ createdAt: -1 }).limit(5).lean(),
      Lead.find({ vendor: vendor._id, isActive: true }).sort({ score: -1 }).limit(5).lean(),
    ]);
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.totalAmount || 0), 0);

    return {
      answer: `**Your Supplier Dashboard**\n- **Products:** ${products.length} listed\n- **Orders:** ${orders.length} ($${totalRevenue.toLocaleString()} revenue)\n- **Quotations Sent:** ${quotations.length}\n- **Reviews:** ${reviews.length} (avg ${reviews.reduce((s, r) => s + (r.rating || 0), 0) / (reviews.length || 1).toFixed(1)}★)\n- **Active Leads:** ${leads.length}\n\n**Top Leads:**\n${leads.slice(0, 3).map(l => `- ${l.company} (score: ${l.score}, stage: ${l.stage})`).join('\n')}`,
      confidence: 0.9,
      evidence: [`${products.length} products listed`, `${orders.length} orders received`, `${leads.length} active leads`],
      suggestedActions: ['Manage product inventory', 'View order details', 'Follow up on leads', 'Check reviews'],
      relatedEntities: ['Product', 'EscrowOrder', 'Lead', 'Review'],
    };
  }

  async _handleExecutiveCopilot(query, userId) {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const [totalRevenue, orders30d, orders365d, vendors, users, revenueByMonth] = await Promise.all([
      MarketplaceRevenue.aggregate([{ $match: { status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      EscrowOrder.countDocuments({ createdAt: { $gte: last30 } }),
      EscrowOrder.countDocuments({ createdAt: { $gte: last365 } }),
      Vendor.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      MarketplaceRevenue.aggregate([{ $match: { status: 'cleared', createdAt: { $gte: last365 } } }, { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    ]);

    return {
      answer: `**Executive KPI Dashboard**\n- **Total Revenue:** $${(totalRevenue[0]?.total || 0).toLocaleString()}\n- **Orders (30d):** ${orders30d} | **(365d):** ${orders365d}\n- **Active Vendors:** ${vendors}\n- **Active Users:** ${users}\n- **Revenue Transactions:** ${totalRevenue[0]?.count || 0}\n\n**Monthly Revenue Trend (last 12 months):**\n${revenueByMonth.map(m => `  Month ${m._id}: $${m.total.toLocaleString()}`).join('\n')}`,
      confidence: 0.94,
      evidence: [`$${(totalRevenue[0]?.total || 0).toLocaleString()} total revenue`, `${orders365d} orders annually`, `${vendors} active vendors`],
      suggestedActions: ['View detailed revenue breakdown', 'Generate growth forecast', 'Export executive summary'],
      relatedEntities: ['MarketplaceRevenue', 'EscrowOrder', 'Vendor', 'User'],
    };
  }

  async _handleFinanceCopilot(query, userId) {
    const [invoices, revenue, payments, ledgerEntries] = await Promise.all([
      Invoice.find({}).sort({ createdAt: -1 }).limit(10).lean(),
      MarketplaceRevenue.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      mongoose.model('Payment').find({}).sort({ createdAt: -1 }).limit(10).lean(),
      mongoose.model('LedgerEntry').aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    const totalRevenue = revenue.reduce((s, r) => s + r.total, 0);
    const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

    return {
      answer: `**Financial Overview**\n- **Total Revenue:** $${totalRevenue.toLocaleString()}\n- **Pending/Overdue Invoices:** ${pendingInvoices.length}\n- **Total Invoices:** ${invoices.length}\n\n**Revenue Breakdown:**\n${revenue.map(r => `- ${r._id}: $${r.total.toLocaleString()} (${r.count} txns)`).join('\n')}\n\n**Ledger Summary:**\n${ledgerEntries.map(l => `- ${l._id}: $${l.total.toLocaleString()}`).join('\n')}`,
      confidence: 0.91,
      evidence: [`$${totalRevenue.toLocaleString()} total revenue`, `${revenue.length} revenue types`, `${pendingInvoices.length} pending invoices`],
      suggestedActions: ['Review pending invoices', 'Generate financial report', 'View ledger details'],
      relatedEntities: ['Invoice', 'MarketplaceRevenue', 'Payment', 'LedgerEntry'],
    };
  }

  async _handleComplianceCopilot(query, userId) {
    const [verifications, totalVendors, pendingDocs] = await Promise.all([
      ComplianceVerification.find({}).sort({ createdAt: -1 }).limit(20).lean(),
      Vendor.countDocuments({}),
      ComplianceVerification.countDocuments({ status: 'pending_documents' }),
    ]);
    const verifiedCount = verifications.filter(v => v.status === 'verified').length;
    const highRiskCount = verifications.filter(v => v.riskLevel === 'high').length;

    return {
      answer: `**Compliance Dashboard**\n- **Total Vendors:** ${totalVendors}\n- **Verified:** ${verifiedCount}\n- **Pending Documents:** ${pendingDocs}\n- **High Risk:** ${highRiskCount}\n\n**Recent Verifications:**\n${verifications.slice(0, 5).map(v => `- Vendor ${v.vendor} | Status: ${v.status} | Risk: ${v.riskLevel} | Badge: ${v.badge}`).join('\n')}`,
      confidence: 0.89,
      evidence: [`${verifiedCount} verified vendors`, `${pendingDocs} pending document submissions`, `${highRiskCount} high risk entities`],
      suggestedActions: ['Review pending verifications', 'Check high risk entities', 'Generate compliance report'],
      relatedEntities: ['ComplianceVerification', 'Vendor', 'Document'],
    };
  }

  async _handleSalesCopilot(query, userId) {
    const vendor = await Vendor.findOne({ user: userId }).lean();
    const vendorFilter = vendor ? { vendor: vendor._id } : {};
    const [leads, wonLeads, totalPipeline] = await Promise.all([
      Lead.find({ ...vendorFilter, isActive: true }).sort({ score: -1 }).limit(10).lean(),
      Lead.countDocuments({ ...vendorFilter, stage: 'won' }),
      Lead.aggregate([{ $match: { ...vendorFilter, stage: { $in: ['negotiating', 'waiting'] } } }, { $group: { _id: null, total: { $sum: '$estimatedValue' } } }]),
    ]);
    const stageBreakdown = {};
    for (const l of leads) { stageBreakdown[l.stage] = (stageBreakdown[l.stage] || 0) + 1; }

    return {
      answer: `**Sales Performance**\n- **Active Leads:** ${leads.length}\n- **Won Deals:** ${wonLeads}\n- **Pipeline Value:** $${(totalPipeline[0]?.total || 0).toLocaleString()}\n\n**Lead Stages:**\n${Object.entries(stageBreakdown).map(([s, c]) => `- ${s}: ${c}`).join('\n')}\n\n**Top Leads:**\n${leads.slice(0, 5).map(l => `- ${l.company} | Score: ${l.score} | Value: $${(l.estimatedValue || 0).toLocaleString()} | Stage: ${l.stage}`).join('\n')}`,
      confidence: 0.87,
      evidence: [`${wonLeads} won deals`, `$${(totalPipeline[0]?.total || 0).toLocaleString()} pipeline value`, `${leads.length} active leads`],
      suggestedActions: ['Follow up with top leads', 'View sales pipeline', 'Generate lead report'],
      relatedEntities: ['Lead', 'Vendor'],
    };
  }

  async _handleSupportCopilot(query, userId) {
    const [openTickets, inProgressTickets, closedTickets, recentTickets] = await Promise.all([
      Support.countDocuments({ status: 'open' }),
      Support.countDocuments({ status: 'in_progress' }),
      Support.countDocuments({ status: 'closed' }),
      Support.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    const avgResolution = await Support.aggregate([{ $match: { status: 'closed' } }, { $group: { _id: null, avgHours: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600000] } } } }]);

    return {
      answer: `**Support Dashboard**\n- **Open Tickets:** ${openTickets}\n- **In Progress:** ${inProgressTickets}\n- **Closed:** ${closedTickets}\n- **Avg Resolution:** ${avgResolution[0] ? Math.round(avgResolution[0].avgHours) : 'N/A'} hours\n\n**Recent Tickets:**\n${recentTickets.map(t => `- ${t.subject} | Status: ${t.status} | Priority: ${t.priority}`).join('\n')}`,
      confidence: 0.86,
      evidence: [`${openTickets} open tickets`, `${closedTickets} resolved`, `${avgResolution[0] ? Math.round(avgResolution[0].avgHours) : 0}h avg resolution`],
      suggestedActions: ['View open tickets', 'Assign support agents', 'Generate support report'],
      relatedEntities: ['Support', 'User'],
    };
  }

  async _handleModeratorCopilot(query, userId) {
    const [pendingItems, inReviewItems, escalatedItems, recentQueue, entityCounts] = await Promise.all([
      ModerationQueue.countDocuments({ status: 'pending' }),
      ModerationQueue.countDocuments({ status: 'in_review' }),
      ModerationQueue.countDocuments({ status: 'escalated' }),
      ModerationQueue.find({}).sort({ priority: -1, createdAt: 1 }).limit(10).lean(),
      ModerationQueue.aggregate([{ $group: { _id: '$entityType', count: { $sum: 1 } } }]),
    ]);

    return {
      answer: `**Moderation Queue**\n- **Pending:** ${pendingItems}\n- **In Review:** ${inReviewItems}\n- **Escalated:** ${escalatedItems}\n\n**By Entity Type:**\n${entityCounts.map(e => `- ${e._id}: ${e.count}`).join('\n')}\n\n**Priority Queue:**\n${recentQueue.slice(0, 5).map(m => `- [${m.priority}] ${m.entityType} | Reason: ${m.reason} | Status: ${m.status}`).join('\n')}`,
      confidence: 0.93,
      evidence: [`${pendingItems} pending items`, `${escalatedItems} escalated items`, `${entityCounts.length} entity types`],
      suggestedActions: ['Review pending queue', 'Handle escalated items', 'Assign moderators'],
      relatedEntities: ['ModerationQueue', 'User'],
    };
  }

  async _handleOperationsCopilot(query, userId) {
    const [disputes, orders, pendingOrders, recentJobs] = await Promise.all([
      Dispute.find({}).sort({ createdAt: -1 }).limit(10).lean(),
      EscrowOrder.countDocuments({}),
      EscrowOrder.countDocuments({ status: 'pending' }),
      mongoose.model('AgentTask').find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review').length;
    const shippedOrders = await EscrowOrder.countDocuments({ shipmentStatus: { $in: ['shipped', 'in_transit'] } });

    return {
      answer: `**Operations Center**\n- **Total Orders:** ${orders}\n- **Pending:** ${pendingOrders} | **Shipped:** ${shippedOrders}\n- **Active Disputes:** ${openDisputes}\n\n**Recent Disputes:**\n${disputes.slice(0, 5).map(d => `- Order ${d.order} | Status: ${d.status} | Reason: ${d.reason}`).join('\n')}\n\n**Agent Tasks:**\n${recentJobs.map(j => `- ${j.agent}: ${j.action} [${j.status}]`).join('\n')}`,
      confidence: 0.88,
      evidence: [`${pendingOrders} pending orders`, `${shippedOrders} in transit`, `${openDisputes} active disputes`],
      suggestedActions: ['Process pending orders', 'Review open disputes', 'Monitor agent tasks'],
      relatedEntities: ['EscrowOrder', 'Dispute', 'AgentTask'],
    };
  }

  async _handleGeneralQuery(query, userId) {
    return {
      answer: `I can help you with insights across the platform. Try asking about:\n- **Orders, Products, Revenue**\n- **Compliance, Moderation, Support**\n- **Sales Leads, KPIs, Forecasts**\n- **System Health, Disputes, Operations**\n\nHow can I assist you today?`,
      confidence: 0.7,
      evidence: ['General query - no specific data matched'],
      suggestedActions: ['Ask about orders', 'Check platform metrics', 'View compliance status'],
      relatedEntities: [],
    };
  }
}

export const aiCopilotService = new AiCopilotService();
