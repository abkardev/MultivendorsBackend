import { operationalAnalyticsService } from '../services/operationalAnalyticsService.js';

export const getOperationalDashboard = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getOperationalDashboard();
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSystemUsage = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getSystemUsage(req.query.period || '7d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFeatureAdoption = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getFeatureAdoption();
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiUsage = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getAiUsage(req.query.period || '30d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchUsage = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getSearchUsage(req.query.period || '30d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getNotificationUsage = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getNotificationUsage(req.query.period || '30d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPerformanceAnalytics = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getPerformanceAnalytics(req.query.period || '7d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getErrorAnalytics = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getErrorAnalytics(req.query.period || '7d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGrowthMetrics = async (req, res) => {
  try {
    const data = await operationalAnalyticsService.getGrowthMetrics(req.query.period || '30d');
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
