import { Setting } from '../models/Setting.js';

class SettingsService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.CACHE_TTL = 5 * 60 * 1000;
  }

  invalidateCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  async _loadAll() {
    if (this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cache;
    }

    const settings = await Setting.find({});
    const map = {};
    for (const s of settings) {
      map[s.key] = s;
    }
    this.cache = map;
    this.cacheTimestamp = Date.now();
    return map;
  }

  async get(key) {
    const all = await this._loadAll();
    const setting = all[key];
    if (!setting) return null;
    return setting;
  }

  async getValue(key, defaultValue = null) {
    const setting = await this.get(key);
    if (!setting) return defaultValue;
    return setting.value;
  }

  async set(key, value, userId) {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true },
    );
    this.invalidateCache();
    return setting;
  }

  async getByCategory(category) {
    const all = await this._loadAll();
    const result = {};
    for (const [key, setting] of Object.entries(all)) {
      if (setting.category === category) {
        result[key] = setting;
      }
    }
    return result;
  }

  async getAllGrouped() {
    const all = await this._loadAll();
    const grouped = {};
    for (const [key, setting] of Object.entries(all)) {
      const cat = setting.category;
      if (!grouped[cat]) grouped[cat] = {};
      grouped[cat][key] = setting;
    }
    return grouped;
  }

  async getPublic() {
    const all = await this._loadAll();
    const result = {};
    for (const [key, setting] of Object.entries(all)) {
      if (setting.isPublic) {
        result[key] = setting.value;
      }
    }
    return result;
  }

  async upsert(key, data, userId) {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { $set: data },
      { upsert: true, new: true, runValidators: true },
    );
    this.invalidateCache();
    return setting;
  }

  async delete(key) {
    await Setting.findOneAndDelete({ key });
    this.invalidateCache();
  }
}

export const settingsService = new SettingsService();
