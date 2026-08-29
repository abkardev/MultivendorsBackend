import { Order } from '../models/orderModel.js';
import Dispute from '../models/Dispute.js';
import { Announcement } from '../models/announcementModel.js';
import { logAuditEvent } from '../services/auditService.js';

class ExecutiveAIAssistantService {
  async answerQuery(userId, query) {
    const q = query.toLowerCase();
    let answer = { question: query, answer: '', data: [], confidence: 0 };

    if (q.includes('procurement cost') || q.includes('spend') || q.includes('spending')) {
      const orders = await Order.find({ buyer: userId }).lean();
      const total = orders.reduce((s, o) => s + (o.total || 0), 0);
      const monthly = total / Math.max(1, orders.length);
      answer.answer = `Total procurement spend is ${(total).toLocaleString()} SAR across ${orders.length} orders. Average monthly spend is approximately ${Math.round(monthly).toLocaleString()} SAR.`;
      answer.data = { totalSpend: total, orderCount: orders.length, avgMonthly: monthly };
      answer.confidence = 85;
    }

    if (q.includes('supplier') && (q.includes('replace') || q.includes('worst') || q.includes('risk'))) {
      const disputes = await Dispute.find({ buyer: userId }).lean();
      const vendors = [...new Set(disputes.map(d => d.vendor?.toString()).filter(Boolean))];
      if (vendors.length > 0) {
        answer.answer = `Found ${vendors.length} supplier(s) with disputes. Consider reviewing these relationships.`;
        answer.data = { atRiskVendors: vendors.length, disputeCount: disputes.length };
        answer.confidence = 70;
      } else {
        answer.answer = 'No supplier relationships with disputes detected. Your supplier portfolio appears healthy.';
        answer.confidence = 60;
      }
    }

    if (q.includes('save money') || q.includes('savings') || q.includes('cost reduction')) {
      const orders = await Order.find({ buyer: userId }).lean();
      const nonEscrowHighValue = orders.filter(o => (o.total || 0) > 50000 && o.paymentMethod !== 'escrow');
      const potentialSavings = nonEscrowHighValue.length * 2500;
      answer.answer = `Identified ${nonEscrowHighValue.length} high-value order(s) not using escrow. Estimated savings from escrow negotiation: ${potentialSavings.toLocaleString()} SAR.`;
      answer.data = { highValueNonEscrow: nonEscrowHighValue.length, potentialSavings };
      answer.confidence = 75;
    }

    if (q.includes('risk') && (q.includes('highest') || q.includes('biggest'))) {
      const disputes = await Dispute.find({ buyer: userId }).lean();
      const openDisputes = disputes.filter(d => d.status === 'open').length;
      const totalDisputes = disputes.length;
      answer.answer = `Currently ${openDisputes} open dispute(s) out of ${totalDisputes} total. This is your highest active risk area.`;
      answer.data = { openDisputes, totalDisputes };
      answer.confidence = 80;
    }

    if (q.includes('overspend') || q.includes('over budget') || q.includes('department')) {
      const orders = await Order.find({ buyer: userId }).lean();
      const total = orders.reduce((s, o) => s + (o.total || 0), 0);
      answer.answer = `Total spend is ${(total).toLocaleString()} SAR. Set budget targets to compare against actual spend.`;
      answer.data = { totalSpend: total };
      answer.confidence = 50;
    }

    if (q.includes('contract') && (q.includes('expire') || q.includes('renewal'))) {
      answer.answer = 'Contract tracking is available. Please check the Contract Intelligence page for detailed renewal information.';
      answer.confidence = 90;
    }

    if (!answer.answer) {
      answer.answer = 'I can analyze your procurement, supplier relationships, spending patterns, risks, and contracts. Please ask a specific question about any of these areas.';
      answer.confidence = 100;
    }

    logAuditEvent({ userId, action: 'executive_ai_query', category: 'executive_intelligence', details: { query } });
    return answer;
  }
}

export default new ExecutiveAIAssistantService();
