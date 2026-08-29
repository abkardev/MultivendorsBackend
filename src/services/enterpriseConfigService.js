import { PlatformSetting } from '../models/PlatformSetting.js';
import { RuntimeConfig } from '../models/RuntimeConfig.js';
import { Setting } from '../models/Setting.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseConfigService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000;
    this.cacheTimestamp = null;
  }

  invalidateCache() {
    this.cache.clear();
    this.cacheTimestamp = null;
  }

  async _loadAll() {
    if (this.cacheTimestamp && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL && this.cache.size > 0) {
      return this.cache;
    }
    const settings = await PlatformSetting.find({ isActive: true }).lean();
    const env = process.env.NODE_ENV || 'development';
    for (const s of settings) {
      if (s.environmentOverrides && s.environmentOverrides[env] !== undefined) {
        s.value = s.environmentOverrides[env];
      }
      this.cache.set(s.key, s);
    }
    this.cacheTimestamp = Date.now();
    return this.cache;
  }

  async get(key) {
    const all = await this._loadAll();
    return all.get(key) || null;
  }

  async getValue(key, defaultValue = null) {
    const setting = await this.get(key);
    return setting ? setting.value : defaultValue;
  }

  async set(key, value, userId, options = {}) {
    const existing = await PlatformSetting.findOne({ key });
    const newVersion = existing ? existing.version + 1 : 1;
    const setting = await PlatformSetting.findOneAndUpdate(
      { key, version: { $exists: true } },
      {
        $set: {
          value,
          version: newVersion,
          updatedBy: userId,
          ...options,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    this.invalidateCache();
    await logAuditEvent({
      userId, action: 'config.update', category: 'system',
      entityType: 'PlatformSetting', entityId: setting._id,
      oldValue: existing ? { value: existing.value } : null,
      newValue: { value, version: newVersion },
      description: `Updated config ${key} to v${newVersion}`,
    });
    return setting;
  }

  async create(data, userId) {
    const setting = await PlatformSetting.create({ ...data, createdBy: userId });
    this.invalidateCache();
    await logAuditEvent({
      userId, action: 'config.create', category: 'system',
      entityType: 'PlatformSetting', entityId: setting._id,
      newValue: { key: data.key, category: data.category },
      description: `Created config ${data.key}`,
    });
    return setting;
  }

  async delete(key, userId) {
    const existing = await PlatformSetting.findOne({ key });
    if (!existing) return null;
    await PlatformSetting.findOneAndUpdate({ key }, { isActive: false });
    this.invalidateCache();
    await logAuditEvent({
      userId, action: 'config.delete', category: 'system',
      entityType: 'PlatformSetting', entityId: existing._id,
      oldValue: { key, value: existing.value },
      description: `Deleted config ${key}`,
    });
    return existing;
  }

  async getByCategory(category) {
    const settings = await PlatformSetting.find({ category, isActive: true }).sort({ group: 1, key: 1 });
    return settings;
  }

  async getAllGrouped() {
    const settings = await PlatformSetting.find({ isActive: true }).sort({ category: 1, group: 1, key: 1 });
    const grouped = {};
    for (const s of settings) {
      const cat = s.category;
      if (!grouped[cat]) grouped[cat] = {};
      const grp = s.group || '_default';
      if (!grouped[cat][grp]) grouped[cat][grp] = [];
      grouped[cat][grp].push(s);
    }
    return grouped;
  }

  async getVersionHistory(key) {
    return PlatformSetting.find({ key }).sort({ version: -1 });
  }

  async rollback(key, targetVersion, userId) {
    const target = await PlatformSetting.findOne({ key, version: targetVersion });
    if (!target) throw new Error(`Version ${targetVersion} not found for ${key}`);
    const current = await PlatformSetting.findOne({ key, isActive: true }).sort({ version: -1 });
    const newSetting = await PlatformSetting.create({
      ...target.toObject(),
      _id: undefined,
      version: (current ? current.version : 0) + 1,
      createdBy: userId,
      updatedBy: userId,
    });
    this.invalidateCache();
    await logAuditEvent({
      userId, action: 'config.rollback', category: 'system',
      entityType: 'PlatformSetting', entityId: newSetting._id,
      oldValue: { key, fromVersion: current?.version },
      newValue: { key, toVersion: targetVersion, newVersion: newSetting.version },
      description: `Rolled back ${key} from v${current?.version} to v${targetVersion}`,
    });
    return newSetting;
  }

  async importConfig(data, userId) {
    const results = { imported: 0, skipped: 0, errors: [] };
    for (const item of data) {
      try {
        const existing = await PlatformSetting.findOne({ key: item.key });
        if (existing) {
          await this.set(item.key, item.value, userId, {
            category: item.category,
            label: item.label,
            description: item.description,
            type: item.type,
          });
        } else {
          await this.create(item, userId);
        }
        results.imported++;
      } catch (err) {
        results.errors.push({ key: item.key, error: err.message });
      }
    }
    return results;
  }

  async exportConfig(category) {
    const filter = { isActive: true };
    if (category) filter.category = category;
    return PlatformSetting.find(filter).lean();
  }

  async setRuntimeOverride(key, value, userId, environment = 'all') {
    const config = await RuntimeConfig.findOneAndUpdate(
      { key },
      {
        value,
        environment,
        source: 'manual',
        isOverridden: true,
        overriddenBy: userId,
        overriddenAt: new Date(),
      },
      { upsert: true, new: true },
    );
    await logAuditEvent({
      userId, action: 'runtime.override', category: 'system',
      entityType: 'RuntimeConfig', entityId: config._id,
      newValue: { key, value, environment },
      description: `Runtime override ${key} for ${environment}`,
    });
    return config;
  }

  async getRuntimeConfigs(environment) {
    const filter = environment ? { $or: [{ environment }, { environment: 'all' }] } : {};
    return RuntimeConfig.find(filter).sort({ key: 1 });
  }

  async deleteRuntimeOverride(key, userId) {
    const config = await RuntimeConfig.findOneAndDelete({ key });
    if (config) {
      await logAuditEvent({
        userId, action: 'runtime.override.delete', category: 'system',
        entityType: 'RuntimeConfig', entityId: config._id,
        description: `Removed runtime override ${key}`,
      });
    }
    return config;
  }

  async validateSetting(key, value) {
    const setting = await this.get(key);
    if (!setting) return { valid: false, error: 'Setting not found' };
    if (!setting.validation) return { valid: true };
    const v = setting.validation;
    if (v.required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: 'Value is required' };
    }
    if (typeof value === 'number') {
      if (v.min !== undefined && value < v.min) return { valid: false, error: `Minimum value is ${v.min}` };
      if (v.max !== undefined && value > v.max) return { valid: false, error: `Maximum value is ${v.max}` };
    }
    if (typeof value === 'string' && v.pattern) {
      if (!new RegExp(v.pattern).test(value)) return { valid: false, error: 'Pattern mismatch' };
    }
    if (v.enumValues && v.enumValues.length > 0 && !v.enumValues.includes(String(value))) {
      return { valid: false, error: `Must be one of: ${v.enumValues.join(', ')}` };
    }
    return { valid: true };
  }
}

export const enterpriseConfigService = new EnterpriseConfigService();
