import { diagnosticsService } from '../services/diagnosticsService.js';

export const runAllChecks = async (req, res) => {
  try {
    const report = await diagnosticsService.runAllChecks(req.user?._id);
    res.json({ status: true, data: report });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const runCheck = async (req, res) => {
  try {
    const report = await diagnosticsService.runCheck(req.params.type, req.user?._id);
    res.json({ status: true, data: report });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportHistory = async (req, res) => {
  try {
    const result = await diagnosticsService.getReportHistory(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLatestReport = async (req, res) => {
  try {
    const report = await diagnosticsService.getLatestReport(req.params.type || 'system');
    if (!report) return res.status(404).json({ status: false, message: 'No reports found' });
    res.json({ status: true, data: report });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const autoFix = async (req, res) => {
  try {
    const result = await diagnosticsService.autoFix(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
