import CommerceIntelligenceService from './commerceIntelligenceService.js';

class ProcurementHealthService {
  async getHealth(userId) {
    return CommerceIntelligenceService.getProcurementHealth(userId);
  }
}

export default new ProcurementHealthService();
