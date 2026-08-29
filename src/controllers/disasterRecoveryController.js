import { disasterRecoveryService } from '../services/disasterRecoveryService.js';

export const createBackupPolicy = async (req, res) => {
  try {
    const policy = await disasterRecoveryService.createBackupPolicy(req.body, req.user._id);
    res.status(201).json({ status: true, data: policy });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateBackupPolicy = async (req, res) => {
  try {
    const policy = await disasterRecoveryService.updateBackupPolicy(req.params.id, req.body, req.user._id);
    if (!policy) return res.status(404).json({ status: false, message: 'Policy not found' });
    res.json({ status: true, data: policy });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listBackupPolicies = async (req, res) => {
  try {
    const policies = await disasterRecoveryService.listBackupPolicies(req.query.type);
    res.json({ status: true, data: policies });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeBackup = async (req, res) => {
  try {
    const record = await disasterRecoveryService.executeBackup(req.params.id, req.user._id);
    res.json({ status: true, data: record });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listBackupRecords = async (req, res) => {
  try {
    const records = await disasterRecoveryService.listBackupRecords(req.params.policyId, req.query);
    res.json({ status: true, data: records });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const verifyBackup = async (req, res) => {
  try {
    const record = await disasterRecoveryService.verifyBackup(req.params.id, req.user._id);
    res.json({ status: true, data: record });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createRecoveryPolicy = async (req, res) => {
  try {
    const policy = await disasterRecoveryService.createRecoveryPolicy(req.body, req.user._id);
    res.status(201).json({ status: true, data: policy });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listRecoveryPolicies = async (req, res) => {
  try {
    const policies = await disasterRecoveryService.listRecoveryPolicies();
    res.json({ status: true, data: policies });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const simulateRecovery = async (req, res) => {
  try {
    const result = await disasterRecoveryService.simulateRecovery(req.params.id, req.user._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDisasterRecoverySummary = async (req, res) => {
  try {
    const summary = await disasterRecoveryService.getDisasterRecoverySummary();
    res.json({ status: true, data: summary });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
