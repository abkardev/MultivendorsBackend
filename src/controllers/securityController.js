import { securityService } from '../services/securityService.js';

export const getSecurityReport = async (req, res) => {
  try {
    const report = await securityService.getSecurityReport();
    res.json({ status: true, data: report });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSecurityHeaders = async (req, res) => {
  try {
    const headers = securityService.getSecurityHeaders();
    res.json({ status: true, data: headers });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectSuspiciousActivity = async (req, res) => {
  try {
    const alerts = await securityService.detectSuspiciousActivity({
      ...req.body,
      userId: req.user?._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ status: true, data: alerts });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSuspiciousIps = async (req, res) => {
  try {
    const report = await securityService.getSecurityReport();
    res.json({ status: true, data: report.suspiciousIps });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const requireAdminApproval = async (req, res) => {
  try {
    const result = await securityService.requireAdminApproval(req.body.action, req.body.userId, req.user._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
