import { deploymentService } from '../services/deploymentService.js';

export const createDeployment = async (req, res) => {
  try {
    const deployment = await deploymentService.createDeployment(req.body, req.user._id);
    res.status(201).json({ status: true, data: deployment });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listDeployments = async (req, res) => {
  try {
    const result = await deploymentService.listDeployments(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeployment = async (req, res) => {
  try {
    const deployment = await deploymentService.getDeployment(req.params.id);
    if (!deployment) return res.status(404).json({ status: false, message: 'Deployment not found' });
    res.json({ status: true, data: deployment });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateDeploymentStatus = async (req, res) => {
  try {
    const deployment = await deploymentService.updateDeploymentStatus(req.params.id, req.body.status, req.user._id);
    res.json({ status: true, data: deployment });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackDeployment = async (req, res) => {
  try {
    const deployment = await deploymentService.rollbackDeployment(req.params.id, req.user._id, req.body.reason);
    res.json({ status: true, data: deployment });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const assessProductionReadiness = async (req, res) => {
  try {
    const readiness = await deploymentService.assessProductionReadiness(req.params.environment, req.user._id);
    res.json({ status: true, data: readiness });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLatestReadiness = async (req, res) => {
  try {
    const readiness = await deploymentService.getLatestReadiness(req.params.environment);
    if (!readiness) return res.status(404).json({ status: false, message: 'No readiness assessment found' });
    res.json({ status: true, data: readiness });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReadinessHistory = async (req, res) => {
  try {
    const history = await deploymentService.getReadinessHistory(req.params.environment);
    res.json({ status: true, data: history });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
