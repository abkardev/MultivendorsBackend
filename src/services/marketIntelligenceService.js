import CommerceIntelligenceService from './commerceIntelligenceService.js';

class MarketIntelligenceService {
  async getMarketOverview() {
    return CommerceIntelligenceService.getMarketIntelligence();
  }
}

export default new MarketIntelligenceService();
