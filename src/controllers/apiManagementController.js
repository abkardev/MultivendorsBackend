import { apiManagementService } from '../services/apiManagementService.js';

export const createApiKey = async (req, res) => {
  try {
    const result = await apiManagementService.createApiKey(req.body, req.user._id);
    res.status(201).json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listApiKeys = async (req, res) => {
  try {
    const keys = await apiManagementService.listApiKeys(req.user._id);
    res.json({ status: true, data: keys });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const key = await apiManagementService.revokeApiKey(req.params.id, req.user._id, req.body.reason);
    if (!key) return res.status(404).json({ status: false, message: 'API key not found' });
    res.json({ status: true, data: key });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rotateApiKey = async (req, res) => {
  try {
    const result = await apiManagementService.rotateApiKey(req.params.id, req.user._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApiKeyUsage = async (req, res) => {
  try {
    const usage = await apiManagementService.getApiKeyUsage(req.params.id);
    if (!usage) return res.status(404).json({ status: false, message: 'API key not found' });
    res.json({ status: true, data: usage });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createClientApplication = async (req, res) => {
  try {
    const app = await apiManagementService.createClientApplication(req.body, req.user._id);
    res.status(201).json({ status: true, data: app });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listClientApplications = async (req, res) => {
  try {
    const apps = await apiManagementService.listClientApplications(req.user._id);
    res.json({ status: true, data: apps });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createRatePlan = async (req, res) => {
  try {
    const plan = await apiManagementService.createRatePlan(req.body);
    res.status(201).json({ status: true, data: plan });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listRatePlans = async (req, res) => {
  try {
    const plans = await apiManagementService.listRatePlans();
    res.json({ status: true, data: plans });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUsageStats = async (req, res) => {
  try {
    const stats = await apiManagementService.getUsageStats();
    res.json({ status: true, data: stats });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWebhookEndpoint = async (req, res) => {
  try {
    const endpoint = await apiManagementService.createWebhookEndpoint(req.body, req.user._id);
    res.status(201).json({ status: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listWebhookEndpoints = async (req, res) => {
  try {
    const endpoints = await apiManagementService.listWebhookEndpoints(req.user._id);
    res.json({ status: true, data: endpoints });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWebhookEndpoint = async (req, res) => {
  try {
    const endpoint = await apiManagementService.updateWebhookEndpoint(req.params.id, req.body, req.user._id);
    if (!endpoint) return res.status(404).json({ status: false, message: 'Webhook not found' });
    res.json({ status: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWebhookEndpoint = async (req, res) => {
  try {
    const endpoint = await apiManagementService.deleteWebhookEndpoint(req.params.id, req.user._id);
    res.json({ status: true, message: 'Webhook endpoint deleted' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const pauseWebhookEndpoint = async (req, res) => {
  try {
    const endpoint = await apiManagementService.pauseWebhookEndpoint(req.params.id, req.user._id, req.body.reason);
    res.json({ status: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resumeWebhookEndpoint = async (req, res) => {
  try {
    const endpoint = await apiManagementService.resumeWebhookEndpoint(req.params.id, req.user._id);
    res.json({ status: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listWebhookEvents = async (req, res) => {
  try {
    const result = await apiManagementService.listWebhookEvents(req.params.id, req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryWebhookEvent = async (req, res) => {
  try {
    const event = await apiManagementService.retryWebhookEvent(req.params.eventId);
    res.json({ status: true, data: event });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWebhookStats = async (req, res) => {
  try {
    const stats = await apiManagementService.getWebhookStats(req.params.id);
    res.json({ status: true, data: stats });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const regenerateWebhookSecret = async (req, res) => {
  try {
    const endpoint = await apiManagementService.regenerateWebhookSecret(req.params.id, req.user._id);
    res.json({ status: true, data: endpoint });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
