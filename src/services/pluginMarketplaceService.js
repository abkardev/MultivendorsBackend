import mongoose from 'mongoose';
import PluginDefinition from '../models/PluginDefinition.js';
import PluginInstallation from '../models/PluginInstallation.js';
import PluginMarketplaceListing from '../models/PluginMarketplaceListing.js';
import { logAuditEvent } from './auditService.js';

class PluginMarketplaceService {
  async getPlugins(filters = {}) {
    const { search, category, status, tags, isOfficial, sort = '-downloads', page = 1, limit = 20 } = filters;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (isOfficial !== undefined) query.isOfficial = isOfficial === 'true' || isOfficial === true;
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
    const [plugins, total] = await Promise.all([
      PluginDefinition.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      PluginDefinition.countDocuments(query),
    ]);
    return { plugins, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getPlugin(id) {
    const plugin = await PluginDefinition.findById(id).lean();
    if (!plugin) throw new Error('Plugin not found');
    const listing = await PluginMarketplaceListing.findOne({ plugin: id }).lean();
    const installs = await PluginInstallation.countDocuments({ plugin: id, status: { $ne: 'uninstalled' } });
    return { ...plugin, marketplace: listing || null, totalInstallations: installs };
  }

  async createPlugin(userId, data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await PluginDefinition.findOne({ slug });
    if (existing) throw new Error(`Plugin with slug '${slug}' already exists`);
    const plugin = await PluginDefinition.create({ ...data, slug, status: 'pending' });
    await logAuditEvent({
      userId, action: 'plugin.create', category: 'plugin',
      entityType: 'PluginDefinition', entityId: plugin._id,
      newValue: { name: plugin.name, slug: plugin.slug, version: plugin.version },
      description: `Plugin submitted for review: ${plugin.name} v${plugin.version}`,
    });
    return plugin;
  }

  async updatePlugin(userId, id, data) {
    const old = await PluginDefinition.findById(id);
    if (!old) throw new Error('Plugin not found');
    if (old.status === 'approved' && data.version && data.version !== old.version) {
      data.status = 'pending';
    }
    const restrictedFields = ['downloads', 'rating', 'reviews'];
    for (const field of restrictedFields) delete data[field];
    const plugin = await PluginDefinition.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'plugin.update', category: 'plugin',
      entityType: 'PluginDefinition', entityId: id,
      oldValue: { name: old.name, version: old.version, status: old.status },
      newValue: { name: plugin.name, version: plugin.version, status: plugin.status },
      description: `Plugin updated: ${plugin.name}`,
    });
    return plugin;
  }

  async approvePlugin(userId, id) {
    const plugin = await PluginDefinition.findById(id);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status !== 'pending') throw new Error('Only pending plugins can be approved');
    plugin.status = 'approved';
    await plugin.save();
    await logAuditEvent({
      userId, action: 'plugin.approve', category: 'plugin',
      entityType: 'PluginDefinition', entityId: id,
      oldValue: { status: 'pending' }, newValue: { status: 'approved' },
      description: `Plugin approved: ${plugin.name}`,
    });
    return plugin;
  }

  async rejectPlugin(userId, id, reason) {
    const plugin = await PluginDefinition.findById(id);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status !== 'pending') throw new Error('Only pending plugins can be rejected');
    plugin.status = 'rejected';
    plugin.metadata = { ...plugin.metadata, rejectionReason: reason, rejectedAt: new Date(), rejectedBy: userId };
    await plugin.save();
    await logAuditEvent({
      userId, action: 'plugin.reject', category: 'plugin',
      entityType: 'PluginDefinition', entityId: id,
      oldValue: { status: 'pending' }, newValue: { status: 'rejected', reason },
      description: `Plugin rejected: ${plugin.name} - ${reason}`,
    });
    return plugin;
  }

  async getInstallations(orgId) {
    const installations = await PluginInstallation.find({ organization: orgId })
      .populate('plugin', 'name slug version category icon description')
      .sort({ installedAt: -1 })
      .lean();
    return installations;
  }

  async installPlugin(userId, pluginId, orgId) {
    const plugin = await PluginDefinition.findById(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status !== 'approved') throw new Error('Plugin is not approved for installation');
    const existing = await PluginInstallation.findOne({ plugin: pluginId, organization: orgId });
    if (existing) {
      if (existing.status === 'uninstalled') {
        existing.status = 'enabled';
        existing.installedAt = new Date();
        existing.installedBy = userId;
        await existing.save();
        await logAuditEvent({
          userId, action: 'plugin.reinstall', category: 'plugin',
          entityType: 'PluginInstallation', entityId: existing._id,
          description: `Plugin re-installed for org ${orgId}: ${plugin.name}`,
        });
        return existing;
      }
      throw new Error('Plugin is already installed for this organization');
    }
    PluginDefinition.findByIdAndUpdate(pluginId, { $inc: { downloads: 1 } }).exec();
    const installation = await PluginInstallation.create({
      plugin: pluginId, organization: orgId, installedBy: userId,
      version: plugin.version, status: 'enabled',
      permissions: plugin.permissions || [],
    });
    await logAuditEvent({
      userId, action: 'plugin.install', category: 'plugin',
      entityType: 'PluginInstallation', entityId: installation._id,
      newValue: { plugin: plugin.name, orgId, version: plugin.version },
      description: `Plugin installed for org ${orgId}: ${plugin.name} v${plugin.version}`,
    });
    return installation;
  }

  async enablePlugin(userId, id) {
    const installation = await PluginInstallation.findById(id);
    if (!installation) throw new Error('Installation not found');
    if (installation.status === 'uninstalled') throw new Error('Cannot enable an uninstalled plugin');
    installation.status = 'enabled';
    await installation.save();
    await logAuditEvent({
      userId, action: 'plugin.enable', category: 'plugin',
      entityType: 'PluginInstallation', entityId: id,
      oldValue: { status: 'disabled' }, newValue: { status: 'enabled' },
      description: 'Plugin enabled',
    });
    return installation;
  }

  async disablePlugin(userId, id) {
    const installation = await PluginInstallation.findById(id);
    if (!installation) throw new Error('Installation not found');
    installation.status = 'disabled';
    await installation.save();
    await logAuditEvent({
      userId, action: 'plugin.disable', category: 'plugin',
      entityType: 'PluginInstallation', entityId: id,
      oldValue: { status: 'enabled' }, newValue: { status: 'disabled' },
      description: 'Plugin disabled',
    });
    return installation;
  }

  async uninstallPlugin(userId, id) {
    const installation = await PluginInstallation.findById(id);
    if (!installation) throw new Error('Installation not found');
    if (installation.status === 'uninstalled') throw new Error('Plugin is already uninstalled');
    installation.status = 'uninstalled';
    await installation.save();
    await logAuditEvent({
      userId, action: 'plugin.uninstall', category: 'plugin',
      entityType: 'PluginInstallation', entityId: id,
      oldValue: { status: installation.status }, newValue: { status: 'uninstalled' },
      description: 'Plugin uninstalled',
    });
    return installation;
  }

  async checkPluginUpdates() {
    const now = new Date();
    const threshold = new Date(now.getTime() - 7 * 86400000);
    const installations = await PluginInstallation.find({
      status: { $in: ['enabled', 'disabled'] },
      $or: [
        { lastUpdatedAt: { $lt: threshold } },
        { lastUpdatedAt: { $exists: false } },
      ],
    }).populate('plugin', 'version name slug').lean();
    const updates = [];
    for (const inst of installations) {
      if (inst.plugin && inst.plugin.version !== inst.version) {
        updates.push({
          installationId: inst._id,
          pluginId: inst.plugin._id,
          pluginName: inst.plugin.name,
          currentVersion: inst.version,
          availableVersion: inst.plugin.version,
        });
        await PluginInstallation.findByIdAndUpdate(inst._id, { updateAvailable: inst.plugin.version });
      }
    }
    return { checkedAt: now, updatesFound: updates.length, updates };
  }

  async updatePluginVersion(userId, id, version) {
    const installation = await PluginInstallation.findById(id);
    if (!installation) throw new Error('Installation not found');
    const plugin = await PluginDefinition.findById(installation.plugin);
    if (!plugin) throw new Error('Plugin definition not found');
    if (!plugin.version || plugin.version === installation.version) {
      throw new Error('No new version available');
    }
    const oldVersion = installation.version;
    installation.version = plugin.version;
    installation.lastUpdatedAt = new Date();
    installation.updateAvailable = undefined;
    await installation.save();
    await logAuditEvent({
      userId, action: 'plugin.update_version', category: 'plugin',
      entityType: 'PluginInstallation', entityId: id,
      oldValue: { version: oldVersion }, newValue: { version: plugin.version },
      description: `Plugin updated from v${oldVersion} to v${plugin.version}`,
    });
    return installation;
  }

  async getPluginDependencies(id) {
    const plugin = await PluginDefinition.findById(id).populate('dependencies.plugin', 'name slug version category').lean();
    if (!plugin) throw new Error('Plugin not found');
    const resolve = async (depNode, depth = 0) => {
      if (depth > 5) return depNode;
      const deps = [];
      for (const dep of depNode.dependencies || []) {
        if (!dep.plugin) continue;
        dep.plugin.dependencies = dep.plugin.dependencies || [];
        const resolved = await PluginDefinition.findById(dep.plugin._id)
          .populate('dependencies.plugin', 'name slug version category').lean();
        deps.push({
          ...dep.plugin,
          requiredVersion: dep.version,
          dependencies: resolved ? await resolve(resolved, depth + 1) : [],
        });
      }
      return { ...depNode, dependencyTree: deps };
    };
    const tree = await resolve(plugin);
    return tree;
  }

  async getMarketplaceListings(filters = {}) {
    const { category, featured, priceMin, priceMax, search, page = 1, limit = 20 } = filters;
    const query = {};
    if (featured !== undefined) query.featured = featured === 'true' || featured === true;
    if (category) query.categories = { $in: Array.isArray(category) ? category : [category] };
    if (priceMin !== undefined || priceMax !== undefined) {
      query.price = {};
      if (priceMin !== undefined) query.price.$gte = Number(priceMin);
      if (priceMax !== undefined) query.price.$lte = Number(priceMax);
    }
    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
      PluginMarketplaceListing.find(query)
        .populate({
          path: 'plugin',
          match: search ? { name: { $regex: search, $options: 'i' } } : {},
          select: 'name slug description version author icon category tags rating reviews downloads isOfficial',
        })
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .lean(),
      PluginMarketplaceListing.countDocuments(query),
    ]);
    const filtered = listings.filter(l => l.plugin);
    return { listings: filtered, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createListing(userId, pluginId, data) {
    const plugin = await PluginDefinition.findById(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status !== 'approved') throw new Error('Only approved plugins can be listed');
    const existing = await PluginMarketplaceListing.findOne({ plugin: pluginId });
    if (existing) throw new Error('Listing already exists for this plugin');
    const listing = await PluginMarketplaceListing.create({ plugin: pluginId, ...data });
    await logAuditEvent({
      userId, action: 'plugin.listing.create', category: 'plugin',
      entityType: 'PluginMarketplaceListing', entityId: listing._id,
      newValue: { plugin: plugin.name, price: listing.price, featured: listing.featured },
      description: `Marketplace listing created for ${plugin.name}`,
    });
    return listing;
  }

  async getPluginAnalytics() {
    const [totalPlugins, approvedPlugins, totalInstallations, categoryStats, popularPlugins] = await Promise.all([
      PluginDefinition.countDocuments(),
      PluginDefinition.countDocuments({ status: 'approved' }),
      PluginInstallation.countDocuments({ status: { $ne: 'uninstalled' } }),
      PluginDefinition.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PluginDefinition.find({ status: 'approved' })
        .sort({ downloads: -1 })
        .limit(10)
        .select('name slug downloads rating category')
        .lean(),
    ]);
    const statusDistribution = await PluginDefinition.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return {
      totalPlugins,
      approvedPlugins,
      pendingPlugins: await PluginDefinition.countDocuments({ status: 'pending' }),
      rejectedPlugins: await PluginDefinition.countDocuments({ status: 'rejected' }),
      totalInstallations,
      activeInstallations: await PluginInstallation.countDocuments({ status: 'enabled' }),
      disabledInstallations: await PluginInstallation.countDocuments({ status: 'disabled' }),
      byCategory: categoryStats.reduce((acc, c) => { acc[c._id || 'uncategorized'] = c.count; return acc; }, {}),
      byStatus: statusDistribution.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      popular: popularPlugins,
    };
  }
}

export const pluginMarketplaceService = new PluginMarketplaceService();
