import { enterpriseCacheService } from '../services/enterpriseCacheService.js';

export const getCacheStats = async (req, res) => {
  try {
    const stats = await enterpriseCacheService.getStats();
    res.json({ status: true, data: stats });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const clearCache = async (req, res) => {
  try {
    await enterpriseCacheService.clear();
    res.json({ status: true, message: 'Cache cleared' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const invalidateGroup = async (req, res) => {
  try {
    await enterpriseCacheService.invalidateGroup(req.params.group);
    res.json({ status: true, message: `Group ${req.params.group} invalidated` });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const invalidateTag = async (req, res) => {
  try {
    await enterpriseCacheService.invalidateTag(req.params.tag);
    res.json({ status: true, message: `Tag ${req.params.tag} invalidated` });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const warmupCache = async (req, res) => {
  try {
    await enterpriseCacheService.warmup(req.body.entries);
    res.json({ status: true, message: 'Cache warmed up' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMemoryUsage = async (req, res) => {
  try {
    const usage = enterpriseCacheService.getMemoryUsage();
    res.json({ status: true, data: usage });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
