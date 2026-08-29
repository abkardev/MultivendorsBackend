import mongoose from 'mongoose';
import { MarketplaceExtension } from '../models/MarketplaceExtension.js';
import { ExtensionCategory } from '../models/ExtensionCategory.js';
import { ExtensionReview } from '../models/ExtensionReview.js';
import { ExtensionInstallation } from '../models/ExtensionInstallation.js';
import { logAuditEvent } from './auditService.js';

class ExtensionMarketplaceService {
  async registerExtension(data) {
    const code = data.code || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await MarketplaceExtension.findOne({ code });
    if (existing) throw new Error(`Extension with code '${code}' already exists`);
    const extension = await MarketplaceExtension.create({ ...data, code, status: 'pending' });
    await logAuditEvent({
      action: 'extension.register',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: extension._id,
      newValue: { name: extension.name, code: extension.code, version: extension.version },
      description: `Extension registered: ${extension.name} v${extension.version}`,
    });
    return extension;
  }

  async updateExtension(id, data) {
    const old = await MarketplaceExtension.findById(id);
    if (!old) throw new Error('Extension not found');
    if (old.status === 'published' && data.version && data.version !== old.version) {
      data.status = 'pending';
    }
    const restricted = ['downloadCount', 'rating', 'reviewCount'];
    for (const f of restricted) delete data[f];
    Object.assign(old, data);
    await old.save();
    await logAuditEvent({
      action: 'extension.update',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: id,
      oldValue: { name: old.name, version: old.version, status: old.status },
      newValue: { name: old.name, version: old.version, status: old.status },
      description: `Extension updated: ${old.name}`,
    });
    return old;
  }

  async getExtension(id) {
    const extension = await MarketplaceExtension.findById(id)
      .populate('categories', 'name code')
      .lean();
    if (!extension) throw new Error('Extension not found');
    const [reviews, installations] = await Promise.all([
      ExtensionReview.find({ extension: id, isActive: true }).sort({ createdAt: -1 }).limit(10).lean(),
      ExtensionInstallation.countDocuments({ extension: id, status: { $ne: 'uninstalled' } }),
    ]);
    return { ...extension, reviews, totalInstallations: installations };
  }

  async listExtensions(filter = {}) {
    const { page = 1, limit = 20, category, type, status, search, tags, sort = '-createdAt' } = filter;
    const query = {};
    if (category) query.categories = { $in: Array.isArray(category) ? category : [category] };
    if (type) query.type = type;
    if (status) query.status = status;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [extensions, total] = await Promise.all([
      MarketplaceExtension.find(query).sort(sortObj).skip(skip).limit(Number(limit))
        .populate('categories', 'name code')
        .lean(),
      MarketplaceExtension.countDocuments(query),
    ]);
    return { extensions, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async approveExtension(id) {
    const ext = await MarketplaceExtension.findById(id);
    if (!ext) throw new Error('Extension not found');
    if (ext.status !== 'pending') throw new Error('Only pending extensions can be approved');
    ext.status = 'approved';
    await ext.save();
    await logAuditEvent({
      action: 'extension.approve',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: id,
      oldValue: { status: 'pending' },
      newValue: { status: 'approved' },
      description: `Extension approved: ${ext.name}`,
    });
    return ext;
  }

  async rejectExtension(id, reason) {
    const ext = await MarketplaceExtension.findById(id);
    if (!ext) throw new Error('Extension not found');
    if (ext.status !== 'pending') throw new Error('Only pending extensions can be rejected');
    ext.status = 'rejected';
    ext.metadata = { ...ext.metadata, rejectionReason: reason, rejectedAt: new Date() };
    await ext.save();
    await logAuditEvent({
      action: 'extension.reject',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: id,
      oldValue: { status: 'pending' },
      newValue: { status: 'rejected', reason },
      description: `Extension rejected: ${ext.name} - ${reason}`,
    });
    return ext;
  }

  async publishExtension(id) {
    const ext = await MarketplaceExtension.findById(id);
    if (!ext) throw new Error('Extension not found');
    if (ext.status !== 'approved') throw new Error('Extension must be approved before publishing');
    ext.status = 'published';
    ext.isActive = true;
    await ext.save();
    await logAuditEvent({
      action: 'extension.publish',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: id,
      oldValue: { status: 'approved' },
      newValue: { status: 'published' },
      description: `Extension published: ${ext.name}`,
    });
    return ext;
  }

  async archiveExtension(id) {
    const ext = await MarketplaceExtension.findById(id);
    if (!ext) throw new Error('Extension not found');
    ext.status = 'archived';
    ext.isActive = false;
    await ext.save();
    await logAuditEvent({
      action: 'extension.archive',
      category: 'extension',
      entityType: 'MarketplaceExtension',
      entityId: id,
      oldValue: { status: ext.status, isActive: true },
      newValue: { status: 'archived', isActive: false },
      description: `Extension archived: ${ext.name}`,
    });
    return ext;
  }

  async createCategory(data) {
    const category = await ExtensionCategory.create(data);
    return category;
  }

  async updateCategory(id, data) {
    const cat = await ExtensionCategory.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!cat) throw new Error('Category not found');
    return cat;
  }

  async listCategories() {
    const categories = await ExtensionCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const buildTree = (parentId = null) =>
      categories
        .filter(c => (c.parent ? c.parent.toString() : null) === (parentId ? parentId.toString() : null))
        .map(c => ({ ...c, children: buildTree(c._id) }));
    return buildTree(null);
  }

  async installExtension(extensionId, tenantId) {
    const ext = await MarketplaceExtension.findById(extensionId);
    if (!ext) throw new Error('Extension not found');
    if (ext.status !== 'published') throw new Error('Extension is not published');
    const existing = await ExtensionInstallation.findOne({ extension: extensionId, tenant: tenantId });
    if (existing) {
      if (existing.status === 'uninstalled') {
        existing.status = 'installed';
        existing.installedAt = new Date();
        await existing.save();
        await logAuditEvent({
          action: 'extension.reinstall',
          category: 'extension',
          entityType: 'ExtensionInstallation',
          entityId: existing._id,
          description: `Extension re-installed for tenant ${tenantId}: ${ext.name}`,
        });
        return existing;
      }
      throw new Error('Extension already installed for this tenant');
    }
    MarketplaceExtension.findByIdAndUpdate(extensionId, { $inc: { downloadCount: 1 } }).exec();
    const installation = await ExtensionInstallation.create({
      extension: extensionId,
      tenant: tenantId,
      version: ext.version,
      status: 'installed',
    });
    await logAuditEvent({
      action: 'extension.install',
      category: 'extension',
      entityType: 'ExtensionInstallation',
      entityId: installation._id,
      newValue: { extension: ext.name, tenant: tenantId, version: ext.version },
      description: `Extension installed for tenant ${tenantId}: ${ext.name} v${ext.version}`,
    });
    return installation;
  }

  async uninstallExtension(installationId) {
    const inst = await ExtensionInstallation.findById(installationId);
    if (!inst) throw new Error('Installation not found');
    if (inst.status === 'uninstalled') throw new Error('Extension is already uninstalled');
    inst.status = 'uninstalled';
    inst.usage = { calls: 0, errors: 0 };
    await inst.save();
    await logAuditEvent({
      action: 'extension.uninstall',
      category: 'extension',
      entityType: 'ExtensionInstallation',
      entityId: installationId,
      oldValue: { status: inst.status },
      newValue: { status: 'uninstalled' },
      description: 'Extension uninstalled',
    });
    return inst;
  }

  async upgradeExtension(installationId, newVersion) {
    const inst = await ExtensionInstallation.findById(installationId).populate('extension', 'name version');
    if (!inst) throw new Error('Installation not found');
    if (!inst.extension) throw new Error('Extension definition not found');
    if (inst.extension.version === inst.version) throw new Error('Already at latest version');
    const oldVersion = inst.version;
    inst.previousVersion = inst.version;
    inst.version = inst.extension.version;
    inst.lastUpgraded = new Date();
    inst.status = 'active';
    await inst.save();
    await logAuditEvent({
      action: 'extension.upgrade',
      category: 'extension',
      entityType: 'ExtensionInstallation',
      entityId: installationId,
      oldValue: { version: oldVersion },
      newValue: { version: inst.extension.version },
      description: `Extension upgraded from v${oldVersion} to v${inst.extension.version}`,
    });
    return inst;
  }

  async enableExtension(installationId) {
    const inst = await ExtensionInstallation.findById(installationId);
    if (!inst) throw new Error('Installation not found');
    if (inst.status === 'uninstalled') throw new Error('Cannot enable an uninstalled extension');
    const oldStatus = inst.status;
    inst.status = 'active';
    inst.activatedAt = inst.activatedAt || new Date();
    await inst.save();
    await logAuditEvent({
      action: 'extension.enable',
      category: 'extension',
      entityType: 'ExtensionInstallation',
      entityId: installationId,
      oldValue: { status: oldStatus },
      newValue: { status: 'active' },
      description: 'Extension enabled',
    });
    return inst;
  }

  async disableExtension(installationId) {
    const inst = await ExtensionInstallation.findById(installationId);
    if (!inst) throw new Error('Installation not found');
    inst.status = 'inactive';
    await inst.save();
    await logAuditEvent({
      action: 'extension.disable',
      category: 'extension',
      entityType: 'ExtensionInstallation',
      entityId: installationId,
      oldValue: { status: 'active' },
      newValue: { status: 'inactive' },
      description: 'Extension disabled',
    });
    return inst;
  }

  async addReview(extensionId, userId, data) {
    const ext = await MarketplaceExtension.findById(extensionId);
    if (!ext) throw new Error('Extension not found');
    const existing = await ExtensionReview.findOne({ extension: extensionId, user: userId, isActive: true });
    if (existing) throw new Error('You have already reviewed this extension');
    const review = await ExtensionReview.create({ extension: extensionId, user: userId, ...data });
    const stats = await ExtensionReview.aggregate([
      { $match: { extension: new mongoose.Types.ObjectId(extensionId), isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await MarketplaceExtension.findByIdAndUpdate(extensionId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        reviewCount: stats[0].count,
      });
    }
    await logAuditEvent({
      action: 'extension.review_add',
      category: 'extension',
      entityType: 'ExtensionReview',
      entityId: review._id,
      newValue: { extension: ext.name, rating: data.rating },
      description: `Review added for ${ext.name} (${data.rating}/5)`,
    });
    return review;
  }

  async getReviews(extensionId, filter = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = filter;
    const query = { extension: extensionId, isActive: true };
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      ExtensionReview.find(query).sort(sortObj).skip(skip).limit(Number(limit))
        .populate('user', 'name email')
        .lean(),
      ExtensionReview.countDocuments(query),
    ]);
    return { reviews, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async checkCompatibility(extensionId, platformVersion, edition) {
    const ext = await MarketplaceExtension.findById(extensionId).lean();
    if (!ext) throw new Error('Extension not found');
    const compat = ext.compatibility || [];
    const matched = compat.find(c => c.edition === edition && c.version === platformVersion);
    if (matched) return { compatible: matched.compatible, match: matched };
    const minOk = !ext.minPlatformVersion || this._compareVersions(platformVersion, ext.minPlatformVersion) >= 0;
    const maxOk = !ext.maxPlatformVersion || this._compareVersions(platformVersion, ext.maxPlatformVersion) <= 0;
    return { compatible: minOk && maxOk, minVersion: ext.minPlatformVersion, maxVersion: ext.maxPlatformVersion };
  }

  async searchExtensions(query) {
    const regex = new RegExp(query, 'i');
    const extensions = await MarketplaceExtension.find({
      isActive: true,
      status: 'published',
      $or: [
        { name: regex },
        { description: regex },
        { tags: { $in: [regex] } },
        { author: regex },
      ],
    })
      .select('name code description version type icon rating downloadCount')
      .sort({ rating: -1, downloadCount: -1 })
      .limit(20)
      .lean();
    return extensions;
  }

  async getExtensionUsage(extensionId) {
    const [totalInstallations, activeInstallations, byTenant] = await Promise.all([
      ExtensionInstallation.countDocuments({ extension: extensionId }),
      ExtensionInstallation.countDocuments({ extension: extensionId, status: { $in: ['active', 'installed'] } }),
      ExtensionInstallation.aggregate([
        { $match: { extension: new mongoose.Types.ObjectId(extensionId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    return { extensionId, totalInstallations, activeInstallations, byStatus: byTenant.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}) };
  }

  async getPopularExtensions(limit = 10) {
    return MarketplaceExtension.find({ status: 'published', isActive: true })
      .sort({ downloadCount: -1, rating: -1 })
      .limit(limit)
      .select('name code description version type icon rating downloadCount')
      .lean();
  }

  async validateExtensionCompatibility() {
    const installations = await ExtensionInstallation.find({
      status: { $in: ['installed', 'active', 'inactive'] },
    }).populate('extension', 'name version minPlatformVersion maxPlatformVersion compatibility status').lean();
    const results = [];
    for (const inst of installations) {
      if (!inst.extension || inst.extension.status !== 'published') {
        results.push({ installationId: inst._id, extensionName: inst.extension?.name || 'Unknown', valid: false, reason: 'Extension not published' });
        continue;
      }
      const ext = inst.extension;
      const minOk = !ext.minPlatformVersion || this._compareVersions(inst.version, ext.minPlatformVersion) >= 0;
      const maxOk = !ext.maxPlatformVersion || this._compareVersions(inst.version, ext.maxPlatformVersion) <= 0;
      const valid = minOk && maxOk;
      if (!valid) {
        await ExtensionInstallation.findByIdAndUpdate(inst._id, { status: 'failed', 'usage.lastError': 'Compatibility validation failed' });
      }
      results.push({ installationId: inst._id, extensionName: ext.name, installedVersion: inst.version, valid, reason: valid ? 'OK' : 'Version out of range' });
    }
    return { validatedAt: new Date(), total: results.length, valid: results.filter(r => r.valid).length, invalid: results.filter(r => !r.valid).length, results };
  }

  _compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
}

export const extensionMarketplaceService = new ExtensionMarketplaceService();
