import { enterpriseAuditService } from '../services/enterpriseAuditService.js';

export const getTimeline = async (req, res) => {
  try {
    const result = await enterpriseAuditService.getTimeline(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEntityHistory = async (req, res) => {
  try {
    const history = await enterpriseAuditService.getEntityHistory(req.params.entityType, req.params.entityId);
    res.json({ status: true, data: history });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const history = await enterpriseAuditService.getUserHistory(req.params.userId, parseInt(req.query.limit) || 50);
    res.json({ status: true, data: history });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSecurityEvents = async (req, res) => {
  try {
    const result = await enterpriseAuditService.getSecurityEvents(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDiff = async (req, res) => {
  try {
    const diff = await enterpriseAuditService.getDiff(req.params.entityType, req.params.entityId, req.params.logId);
    if (!diff) return res.status(404).json({ status: false, message: 'Log not found' });
    res.json({ status: true, data: diff });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getComplianceReport = async (req, res) => {
  try {
    const report = await enterpriseAuditService.getComplianceReport(req.query);
    res.json({ status: true, data: report });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportCsv = async (req, res) => {
  try {
    const csv = await enterpriseAuditService.exportCsv(req.query);
    res.json({ status: true, data: csv });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchAuditLogs = async (req, res) => {
  try {
    const result = await enterpriseAuditService.searchAuditLogs(req.query.q, req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCorrelatedEvents = async (req, res) => {
  try {
    const events = await enterpriseAuditService.getCorrelatedEvents(req.params.correlationId);
    res.json({ status: true, data: events });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
