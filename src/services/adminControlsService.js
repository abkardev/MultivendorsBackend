import { Setting } from '../models/Setting.js';

class AdminControlsService {
  async getWeights() {
    const setting = await Setting.findOne({ key: 'intelligence_weights' }).lean();
    return setting?.value || this.getDefaults();
  }

  async updateWeights(weights, userId) {
    const defaults = this.getDefaults();
    const merged = { ...defaults, ...weights };
    await Setting.findOneAndUpdate(
      { key: 'intelligence_weights' },
      { key: 'intelligence_weights', value: merged, updatedBy: userId },
      { upsert: true, new: true }
    );
    return merged;
  }

  async getThresholds() {
    const setting = await Setting.findOne({ key: 'risk_thresholds' }).lean();
    return setting?.value || { low: 30, moderate: 50, high: 75, critical: 90 };
  }

  async updateThresholds(thresholds, userId) {
    const defaults = { low: 30, moderate: 50, high: 75, critical: 90 };
    const merged = { ...defaults, ...thresholds };
    await Setting.findOneAndUpdate(
      { key: 'risk_thresholds' },
      { key: 'risk_thresholds', value: merged, updatedBy: userId },
      { upsert: true, new: true }
    );
    return merged;
  }

  getDefaults() {
    return {
      ranking: { relevance: 25, reputation: 20, price: 15, delivery: 10, moq: 5, leadTime: 5, capacity: 5, certifications: 5, sustainability: 5, buyerPreference: 5 },
      recommendations: { vendorReputation: 30, price: 25, delivery: 20, quality: 15, risk: 10 },
      trendSensitivity: 0.5,
    };
  }
}

export default new AdminControlsService();
