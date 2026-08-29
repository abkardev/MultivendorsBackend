import CommerceIntelligenceService from './commerceIntelligenceService.js';

class OpportunityDetectionService {
  async detectOpportunities(userId) {
    return CommerceIntelligenceService.detectOpportunities(userId);
  }
}

export default new OpportunityDetectionService();
