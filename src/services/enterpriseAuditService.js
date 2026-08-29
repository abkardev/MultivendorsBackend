/**
 * @deprecated Use enterpriseAuditCenterService instead.
 * This file is maintained for backward compatibility.
 * All functionality has been consolidated into enterpriseAuditCenterService.
 */
import { enterpriseAuditCenterService } from './enterpriseAuditCenterService.js';

class EnterpriseAuditService {
  async getTimeline(options = {}) {
    return enterpriseAuditCenterService.getAuditTimeline(options);
  }

  async getEntityHistory(entityType, entityId) {
    return enterpriseAuditCenterService.getEntityHistory(entityType, entityId);
  }

  async getUserHistory(userId, limit = 50) {
    return enterpriseAuditCenterService.getUserHistory(userId);
  }

  async getSecurityEvents(options = {}) {
    return enterpriseAuditCenterService.getSecurityEvents();
  }

  async getDiff(entityType, entityId, logId) {
    return enterpriseAuditCenterService.getDiff(entityType, entityId, logId);
  }

  async getComplianceReport(options = {}) {
    return enterpriseAuditCenterService.getComplianceReport(options.startDate, options.endDate);
  }

  async exportCsv(options = {}) {
    return enterpriseAuditCenterService.exportCsv(options);
  }

  async searchAuditLogs(query, options = {}) {
    return enterpriseAuditCenterService.searchAuditLogs(query, options);
  }

  async getCorrelatedEvents(correlationId) {
    return enterpriseAuditCenterService.getCorrelatedEvents(correlationId);
  }
}

export const enterpriseAuditService = new EnterpriseAuditService();
