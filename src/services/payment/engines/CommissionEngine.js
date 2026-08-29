import { CommissionRule } from '../models/CommissionRule.js';

export class CommissionEngine {
  async calculate({ vendor, amount, currency, country, category }) {
    const rules = await CommissionRule.find({ isActive: true }).sort({ priority: -1 }).lean();
    for (const rule of rules) {
      if (!this._matchesConditions(rule, { vendor, amount, country, category })) continue;
      const commissionAmount = rule.type2 === 'percentage'
        ? +(amount * (rule.rate / 100)).toFixed(2)
        : Math.min(rule.rate, amount);
      return { rate: rule.rate, amount: commissionAmount, type: rule.type2, ruleId: rule._id, ruleName: rule.name };
    }
    const defaultRate = 5;
    return { rate: defaultRate, amount: +(amount * (defaultRate / 100)).toFixed(2), type: 'percentage', ruleId: null, ruleName: 'default' };
  }

  _matchesConditions(rule, { vendor, amount, country, category }) {
    const c = rule.conditions || {};
    if (c.vendor && String(c.vendor) !== String(vendor)) return false;
    if (c.country && c.country !== country) return false;
    if (c.category && c.category !== category) return false;
    if (c.minAmount && amount < c.minAmount) return false;
    if (c.maxAmount && amount > c.maxAmount) return false;
    if (c.dateRange) {
      const now = new Date();
      if (c.dateRange.start && now < new Date(c.dateRange.start)) return false;
      if (c.dateRange.end && now > new Date(c.dateRange.end)) return false;
    }
    return true;
  }

  async createRule(data) {
    return CommissionRule.create(data);
  }

  async updateRule(id, data) {
    return CommissionRule.findByIdAndUpdate(id, data, { new: true });
  }

  async listRules() {
    return CommissionRule.find().sort({ priority: -1 }).lean();
  }
}

export const commissionEngine = new CommissionEngine();
