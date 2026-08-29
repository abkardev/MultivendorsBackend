import { enterpriseConfigService } from '../services/enterpriseConfigService.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { logAuditEvent } from '../services/auditService.js';

export const listSettings = async (req, res) => {
  try {
    const { category, group } = req.query;
    if (group) {
      const all = await enterpriseConfigService.getAllGrouped();
      return res.json({ status: true, data: all });
    }
    if (category) {
      const settings = await enterpriseConfigService.getByCategory(category);
      return res.json({ status: true, data: settings });
    }
    const settings = await enterpriseConfigService.getAllGrouped();
    res.json({ status: true, data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await enterpriseConfigService.get(req.params.key);
    if (!setting) return res.status(404).json({ status: false, message: 'Setting not found' });
    res.json({ status: true, data: setting });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createSetting = async (req, res) => {
  try {
    const setting = await enterpriseConfigService.create(req.body, req.user._id);
    res.status(201).json({ status: true, data: setting });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const setting = await enterpriseConfigService.set(req.params.key, req.body.value, req.user._id, req.body);
    res.json({ status: true, data: setting });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteSetting = async (req, res) => {
  try {
    await enterpriseConfigService.delete(req.params.key, req.user._id);
    res.json({ status: true, message: 'Setting deleted' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getVersionHistory = async (req, res) => {
  try {
    const history = await enterpriseConfigService.getVersionHistory(req.params.key);
    res.json({ status: true, data: history });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { version } = req.body;
    const setting = await enterpriseConfigService.rollback(key, version, req.user._id);
    res.json({ status: true, data: setting });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateSetting = async (req, res) => {
  try {
    const result = await enterpriseConfigService.validateSetting(req.params.key, req.body.value);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const importSettings = async (req, res) => {
  try {
    const result = await enterpriseConfigService.importConfig(req.body.settings, req.user._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportSettings = async (req, res) => {
  try {
    const data = await enterpriseConfigService.exportConfig(req.query.category);
    res.json({ status: true, data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listRuntimeConfigs = async (req, res) => {
  try {
    const configs = await enterpriseConfigService.getRuntimeConfigs(req.query.environment);
    res.json({ status: true, data: configs });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const setRuntimeOverride = async (req, res) => {
  try {
    const config = await enterpriseConfigService.setRuntimeOverride(
      req.params.key, req.body.value, req.user._id, req.body.environment,
    );
    res.json({ status: true, data: config });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteRuntimeOverride = async (req, res) => {
  try {
    await enterpriseConfigService.deleteRuntimeOverride(req.params.key, req.user._id);
    res.json({ status: true, message: 'Runtime override removed' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
