import { TaxRule } from '../models/TaxRule.js';

export class TaxEngine {
  async calculate({ amount, country, region, currency, category }) {
    const rule = await TaxRule.findOne({
      country, isActive: true,
      ...(region ? { region } : {}),
    }).sort({ rate: -1 }).lean();
    if (!rule) {
      const defaultRule = await TaxRule.findOne({ country: '*', isActive: true }).sort({ rate: -1 }).lean();
      if (!defaultRule) return { rate: 0, amount: 0, name: 'No tax', type: 'none' };
      const taxAmount = +(amount * (defaultRule.rate / 100)).toFixed(2);
      return { rate: defaultRule.rate, amount: taxAmount, name: defaultRule.name, type: defaultRule.type };
    }
    if (rule.rules?.exemptCategories?.includes(category)) return { rate: 0, amount: 0, name: 'Exempt', type: 'none' };
    if (rule.rules?.minAmount && amount < rule.rules.minAmount) return { rate: 0, amount: 0, name: 'Below minimum', type: 'none' };
    if (rule.rules?.maxAmount && amount > rule.rules.maxAmount) return { rate: 0, amount: 0, name: 'Above maximum', type: 'none' };
    const taxAmount = +(amount * (rule.rate / 100)).toFixed(2);
    return { rate: rule.rate, amount: taxAmount, name: rule.name, type: rule.type };
  }

  async createRule(data) { return TaxRule.create(data); }
  async updateRule(id, data) { return TaxRule.findByIdAndUpdate(id, data, { new: true }); }
  async listRules(filter = {}) { return TaxRule.find(filter).sort({ country: 1, rate: -1 }).lean(); }
  async deleteRule(id) { return TaxRule.findByIdAndDelete(id); }
}

export const taxEngine = new TaxEngine();
