import { enterpriseNotificationService } from '../services/enterpriseNotificationService.js';

export const sendFromTemplate = async (req, res) => {
  try {
    const notification = await enterpriseNotificationService.sendFromTemplate(
      req.body.template, req.body.recipient, req.body.variables, req.body.options,
    );
    res.status(201).json({ status: true, data: notification });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendDigest = async (req, res) => {
  try {
    const digest = await enterpriseNotificationService.sendDigest(req.user._id, req.body.period || 'daily');
    res.json({ status: true, data: digest });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getNotificationAnalytics = async (req, res) => {
  try {
    const analytics = await enterpriseNotificationService.getNotificationAnalytics(req.query);
    res.json({ status: true, data: analytics });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const templates = await enterpriseNotificationService.listTemplates();
    res.json({ status: true, data: templates });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const template = await enterpriseNotificationService.createTemplate(req.body, req.user._id);
    res.status(201).json({ status: true, data: template });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const template = await enterpriseNotificationService.updateTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ status: false, message: 'Template not found' });
    res.json({ status: true, data: template });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
