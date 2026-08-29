import { Order } from '../models/orderModel.js';
import Dispute from '../models/Dispute.js';
import executiveKPIService from './executiveKPIService.js';
import executiveDecisionService from './executiveDecisionService.js';
import budgetIntelligenceService from './budgetIntelligenceService.js';
import supplierPortfolioService from './supplierPortfolioService.js';

class ExecutiveBriefService {
  async generateBrief(userId, type = 'monthly') {
    const [kpis, decisions, budget, portfolio] = await Promise.all([
      executiveKPIService.getKPIs(userId),
      executiveDecisionService.getRecommendations(userId),
      budgetIntelligenceService.getBudgetOverview(userId),
      supplierPortfolioService.getPortfolio(userId),
    ]);

    const orders = await Order.find({ buyer: userId }).lean();
    const disputes = await Dispute.find({ buyer: userId }).lean();

    return {
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Procurement Brief`,
      generatedAt: new Date(),
      period: type,
      executiveSummary: this.generateSummary(kpis, decisions, budget),
      spendOverview: {
        totalSpend: kpis.annualSpend || 0,
        monthlySpend: kpis.monthlySpend || 0,
        averageOrderValue: orders.length > 0 ? Math.round(orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length) : 0,
      },
      savings: {
        achieved: kpis.costSavings || 0,
        roi: kpis.procurementROI || 0,
        opportunities: decisions.filter(d => d.estimatedSavings > 0).reduce((s, d) => s + d.estimatedSavings, 0),
      },
      riskOverview: {
        totalDisputes: disputes.length,
        openDisputes: disputes.filter(d => d.status === 'open').length,
        disputeRate: kpis.disputeRate || 0,
      },
      budgetHealth: budget,
      supplierPerformance: portfolio,
      shipmentStatus: { pending: 0, inTransit: 0, delivered: orders.filter(o => o.status === 'delivered').length },
      escrowUsage: { rate: kpis.escrowUsage || 0, activeCount: 0 },
      pendingApprovals: 0,
      procurementPipeline: {
        activeProjects: 0,
        pendingRfqs: 0,
        underNegotiation: 0,
      },
      forecast: { nextMonth: Math.round((kpis.monthlySpend || 0) * 1.05), confidence: 75 },
      recommendedActions: decisions.slice(0, 3).map(d => ({ action: d.title, priority: d.priority, expectedImpact: d.expectedImpact })),
    };
  }

  generateSummary(kpis, decisions, budget) {
    const parts = [];
    parts.push(`Total procurement spend: ${(kpis.annualSpend || 0).toLocaleString()} SAR`);
    if (kpis.costSavings > 0) parts.push(`Cost savings achieved: ${(kpis.costSavings).toLocaleString()} SAR`);
    if (budget?.riskLevel) parts.push(`Budget risk level: ${budget.riskLevel}`);
    if (decisions.length > 0) parts.push(`${decisions.length} active recommendations`);
    return parts.join('. ') + '.';
  }
}

export default new ExecutiveBriefService();
