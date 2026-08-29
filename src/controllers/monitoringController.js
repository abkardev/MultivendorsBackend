import { monitoringService } from '../services/monitoringService.js';

export const getHealthStatus = async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json({ status: true, data: health });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMetrics = async (req, res) => {
  try {
    const metrics = await monitoringService.getMetrics(req.query);
    res.json({ status: true, data: metrics });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRealtimeMetrics = async (req, res) => {
  try {
    const metrics = await monitoringService.getRealtimeMetrics();
    res.json({ status: true, data: metrics });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getHistoricalMetrics = async (req, res) => {
  try {
    const data = await monitoringService.getHistoricalMetrics(req.params.metric, req.query);
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createAlert = async (req, res) => {
  try {
    const alert = await monitoringService.createAlert(req.body, req.user._id);
    res.status(201).json({ status: true, data: alert });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateAlert = async (req, res) => {
  try {
    const alert = await monitoringService.updateAlert(req.params.id, req.body, req.user._id);
    res.json({ status: true, data: alert });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listAlerts = async (req, res) => {
  try {
    const alerts = await monitoringService.listAlerts();
    res.json({ status: true, data: alerts });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const stats = await monitoringService.getSystemStats();
    res.json({ status: true, data: stats });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const recordHealthCheck = async (req, res) => {
  try {
    const record = await monitoringService.recordHealthCheck(
      req.body.component, req.body.status, req.body.latencyMs, req.body.message,
    );
    res.status(201).json({ status: true, data: record });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
