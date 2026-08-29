import { RuntimeSetting } from '../models/RuntimeSetting.js';
import { logAuditEvent } from './auditService.js';
import { enterpriseConfigService } from './enterpriseConfigService.js';

class ConfigurationService {
  constructor() {
    this.changeLog = [];
  }

  async getRuntimeSettings(category) {
    const filter = { isActive: true };
    if (category) filter.category = category;
    return RuntimeSetting.find(filter).sort({ category: 1, key: 1 }).lean();
  }

  async getRuntimeSetting(key) {
    const setting = await RuntimeSetting.findOne({ key, isActive: true }).lean();
    if (!setting) return null;
    return setting;
  }

  async setRuntimeSetting(key, value, userId) {
    const existing = await RuntimeSetting.findOne({ key });
    const newVersion = existing ? existing.version + 1 : 1;
    const setting = await RuntimeSetting.findOneAndUpdate(
      { key },
      {
        key, value, version: newVersion,
        lastModifiedBy: userId,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    enterpriseConfigService.invalidateCache();
    this.changeLog.push({ key, version: newVersion, userId, action: 'update', timestamp: new Date() });
    await logAuditEvent({
      userId, action: 'config.runtime_set', category: 'system',
      entityType: 'RuntimeSetting', entityId: setting._id,
      oldValue: existing ? { value: existing.value, version: existing.version } : null,
      newValue: { value, version: newVersion },
      description: `Set runtime setting ${key} to v${newVersion}`,
    });
    return setting;
  }

  async deleteRuntimeSetting(key) {
    const setting = await RuntimeSetting.findOneAndUpdate(
      { key },
      { isActive: false },
      { new: true },
    );
    if (setting) {
      enterpriseConfigService.invalidateCache();
      await logAuditEvent({
        action: 'config.runtime_delete', category: 'system',
        entityType: 'RuntimeSetting', entityId: setting._id,
        oldValue: { key, value: setting.value },
        description: `Deleted runtime setting ${key}`,
      });
    }
    return setting;
  }

  async getVersionHistory(key) {
    return RuntimeSetting.find({ key }).sort({ version: -1 }).lean();
  }

  async rollbackSetting(key, targetVersion) {
    const target = await RuntimeSetting.findOne({ key, version: targetVersion });
    if (!target) throw new Error(`Version ${targetVersion} not found for ${key}`);
    const setting = await RuntimeSetting.findOneAndUpdate(
      { key, isActive: true },
      { value: target.value, $inc: { version: 1 } },
      { new: true },
    );
    enterpriseConfigService.invalidateCache();
    this.changeLog.push({ key, version: setting.version, action: 'rollback', targetVersion, timestamp: new Date() });
    await logAuditEvent({
      action: 'config.runtime_rollback', category: 'system',
      entityType: 'RuntimeSetting', entityId: setting._id,
      newValue: { key, restoredVersion: targetVersion, newVersion: setting.version },
      description: `Rolled back ${key} to v${targetVersion}`,
    });
    return setting;
  }

  async validateSetting(key, value) {
    const setting = await RuntimeSetting.findOne({ key }).lean();
    if (!setting) return { valid: false, error: 'Setting not found' };
    switch (setting.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) return { valid: false, error: 'Must be a number' };
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && !['true', 'false'].includes(String(value).toLowerCase())) return { valid: false, error: 'Must be a boolean' };
        break;
      case 'json':
        try { JSON.parse(typeof value === 'string' ? value : JSON.stringify(value)); } catch { return { valid: false, error: 'Invalid JSON' }; }
        break;
      case 'array':
        if (!Array.isArray(value)) return { valid: false, error: 'Must be an array' };
        break;
      default: break;
    }
    return { valid: true };
  }

  async importSettings(data) {
    const results = { imported: 0, skipped: 0, errors: [] };
    for (const item of data) {
      try {
        const existing = await RuntimeSetting.findOne({ key: item.key });
        if (existing) {
          await RuntimeSetting.findOneAndUpdate({ key: item.key }, { value: item.value, $inc: { version: 1 } });
        } else {
          await RuntimeSetting.create({ ...item, version: 1 });
        }
        results.imported++;
      } catch (err) {
        results.errors.push({ key: item.key, error: err.message });
      }
    }
    enterpriseConfigService.invalidateCache();
    return results;
  }

  async exportSettings(category) {
    const filter = { isActive: true };
    if (category) filter.category = category;
    return RuntimeSetting.find(filter).select('key value type category description environment').lean();
  }

  async getEnvironmentOverrides(environment) {
    const settings = await RuntimeSetting.find({
      isActive: true,
      $or: [{ environment }, { environment: 'all' }],
    }).sort({ key: 1 }).lean();
    const overrides = {};
    for (const s of settings) {
      overrides[s.key] = s.value;
    }
    return { environment, overrides, count: settings.length };
  }

  async checkDependencies(key) {
    const settings = await RuntimeSetting.find({ isActive: true }).lean();
    const dependents = settings.filter(s => {
      const val = JSON.stringify(s.value).toLowerCase();
      return val.includes(key.toLowerCase());
    });
    return {
      key,
      dependentCount: dependents.length,
      dependents: dependents.map(d => ({ key: d.key, category: d.category })),
      hasConflicts: dependents.some(d => d.category !== 'general'),
    };
  }

  async getChangeLog() {
    return this.changeLog.slice(-100).reverse();
  }
}

export const configurationService = new ConfigurationService();
