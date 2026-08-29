import mongoose from 'mongoose';
import { ProductEdition } from '../models/ProductEdition.js';
import { EditionFeature } from '../models/EditionFeature.js';
import { EditionPackage } from '../models/EditionPackage.js';
import { EnterpriseLicense } from '../models/EnterpriseLicense.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EditionManagementService {
  async createEdition(data) {
    const edition = await ProductEdition.create(data);
    await logAuditEvent({
      action: 'edition.create', category: 'system',
      entityType: 'ProductEdition', entityId: edition._id,
      newValue: { name: edition.name, code: edition.code, type: edition.type },
      description: `Edition "${edition.name}" created`,
    });
    return edition;
  }

  async updateEdition(id, data) {
    const edition = await ProductEdition.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!edition) throw new Error('Edition not found');
    await logAuditEvent({
      action: 'edition.update', category: 'system',
      entityType: 'ProductEdition', entityId: id,
      newValue: data,
      description: `Edition "${edition.name}" updated`,
    });
    return edition;
  }

  async getEdition(id) {
    const edition = await ProductEdition.findById(id).lean();
    if (!edition) throw new Error('Edition not found');
    const [features, packages] = await Promise.all([
      EditionFeature.find({ edition: id }).sort({ category: 1, featureCode: 1 }).lean(),
      EditionPackage.find({ edition: id, isActive: true }).sort({ type: 1, name: 1 }).lean(),
    ]);
    return { ...edition, features, packages };
  }

  async listEditions(filter = {}) {
    const { page = 1, limit = 20, type, isActive, isPublic, search } = filter;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    if (isPublic !== undefined) query.isPublic = isPublic;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ProductEdition.find(query).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(Number(limit)).lean(),
      ProductEdition.countDocuments(query),
    ]);
    const editionIds = data.map(e => e._id);
    const features = await EditionFeature.find({ edition: { $in: editionIds } }).lean();
    const featureMap = {};
    for (const f of features) {
      if (!featureMap[f.edition]) featureMap[f.edition] = [];
      featureMap[f.edition].push(f);
    }
    const enriched = data.map(e => ({ ...e, features: featureMap[e._id] || [] }));
    return { data: enriched, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async deleteEdition(id) {
    const edition = await ProductEdition.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!edition) throw new Error('Edition not found');
    await EditionFeature.updateMany({ edition: id }, { $set: { isActive: false } });
    await EditionPackage.updateMany({ edition: id }, { $set: { isActive: false } });
    await logAuditEvent({
      action: 'edition.delete', category: 'system',
      entityType: 'ProductEdition', entityId: id,
      oldValue: { name: edition.name, code: edition.code },
      description: `Edition "${edition.name}" soft deleted`,
    });
    return { message: 'Edition deleted' };
  }

  async getEditionsByType(type) {
    const editions = await ProductEdition.find({ type, isActive: true }).sort({ sortOrder: 1 }).lean();
    const editionIds = editions.map(e => e._id);
    const features = await EditionFeature.find({ edition: { $in: editionIds } }).lean();
    const featureMap = {};
    for (const f of features) {
      if (!featureMap[f.edition]) featureMap[f.edition] = [];
      featureMap[f.edition].push(f);
    }
    return editions.map(e => ({ ...e, features: featureMap[e._id] || [] }));
  }

  async getEditionForTenant(tenantId) {
    const license = await EnterpriseLicense.findOne({ tenant: tenantId, status: 'active' }).lean();
    if (!license || !license.edition) {
      const defaultEdition = await ProductEdition.findOne({ isActive: true }).sort({ sortOrder: 1 }).lean();
      if (!defaultEdition) throw new Error('No edition available');
      const features = await EditionFeature.find({ edition: defaultEdition._id }).lean();
      return { ...defaultEdition, features, source: 'default' };
    }
    const edition = await ProductEdition.findOne({ code: license.edition, isActive: true }).lean();
    if (!edition) throw new Error(`Edition "${license.edition}" not found`);
    const features = await EditionFeature.find({ edition: edition._id }).lean();
    return { ...edition, features, source: 'license' };
  }

  async checkFeatureAccess(editionId, featureCode) {
    const edition = await ProductEdition.findById(editionId).lean();
    if (!edition) throw new Error('Edition not found');
    const feature = await EditionFeature.findOne({ edition: editionId, featureCode }).lean();
    if (!feature) return { accessible: false, reason: `Feature "${featureCode}" not found in edition` };
    if (feature.type === 'boolean') {
      return { accessible: feature.defaultValue === true || feature.defaultValue === 'true', feature, limits: null };
    }
    return { accessible: true, feature, limits: feature.limits || null };
  }

  async createFeature(editionId, data) {
    const feature = await EditionFeature.create({ ...data, edition: editionId });
    await logAuditEvent({
      action: 'edition.feature.create', category: 'system',
      entityType: 'EditionFeature', entityId: feature._id,
      newValue: { editionId, featureCode: feature.featureCode, name: feature.name },
      description: `Feature "${feature.name}" added to edition ${editionId}`,
    });
    return feature;
  }

  async updateFeature(id, data) {
    const feature = await EditionFeature.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!feature) throw new Error('Feature not found');
    return feature;
  }

  async createPackage(editionId, data) {
    const pkg = await EditionPackage.create({ ...data, edition: editionId });
    await logAuditEvent({
      action: 'edition.package.create', category: 'system',
      entityType: 'EditionPackage', entityId: pkg._id,
      newValue: { editionId, name: pkg.name, code: pkg.code, type: pkg.type },
      description: `Package "${pkg.name}" created for edition ${editionId}`,
    });
    return pkg;
  }

  async updatePackage(id, data) {
    const pkg = await EditionPackage.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!pkg) throw new Error('Package not found');
    return pkg;
  }

  async getPackages(editionId) {
    return EditionPackage.find({ edition: editionId, isActive: true }).sort({ type: 1, name: 1 }).lean();
  }

  async getFeatureLimits(editionId, featureCode) {
    const feature = await EditionFeature.findOne({ edition: editionId, featureCode }).lean();
    if (!feature) throw new Error(`Feature "${featureCode}" not found`);
    return {
      featureCode: feature.featureCode,
      name: feature.name,
      type: feature.type,
      defaultValue: feature.defaultValue,
      limits: feature.limits || null,
    };
  }

  async compareEditions(editionIds) {
    const editions = await ProductEdition.find({ _id: { $in: editionIds } }).sort({ sortOrder: 1 }).lean();
    const allFeatures = await EditionFeature.find({ edition: { $in: editionIds } }).lean();
    const featureMap = {};
    for (const f of allFeatures) {
      if (!featureMap[f.edition]) featureMap[f.edition] = [];
      featureMap[f.edition].push(f);
    }
    return editions.map(e => ({
      _id: e._id,
      name: e.name,
      code: e.code,
      type: e.type,
      price: e.price,
      maxUsers: e.maxUsers,
      maxStorage: e.maxStorage,
      maxApiCalls: e.maxApiCalls,
      features: featureMap[e._id] || [],
    }));
  }

  async getEditionComparison() {
    const editions = await ProductEdition.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 }).lean();
    const editionIds = editions.map(e => e._id);
    const allFeatures = await EditionFeature.find({ edition: { $in: editionIds } }).lean();
    const featureMap = {};
    for (const f of allFeatures) {
      if (!featureMap[f.edition]) featureMap[f.edition] = [];
      featureMap[f.edition].push(f);
    }
    const allFeatureCodes = [...new Set(allFeatures.map(f => f.featureCode))];
    const comparisonMatrix = allFeatureCodes.map(code => {
      const row = { featureCode: code, name: null, category: null };
      for (const e of editions) {
        const feature = (featureMap[e._id] || []).find(f => f.featureCode === code);
        row[e.code] = feature ? { available: true, value: feature.defaultValue, limits: feature.limits, name: feature.name } : { available: false, value: null };
        if (feature && !row.name) {
          row.name = feature.name;
          row.category = feature.category;
        }
      }
      return row;
    });
    return { editions, comparison: comparisonMatrix };
  }

  async validateEditionFeatures(editionId) {
    const edition = await ProductEdition.findById(editionId).lean();
    if (!edition) throw new Error('Edition not found');
    const features = await EditionFeature.find({ edition: editionId }).lean();
    const errors = [];
    const warnings = [];
    for (const feature of features) {
      if (feature.dependsOn && feature.dependsOn.length > 0) {
        for (const dep of feature.dependsOn) {
          const depFeature = features.find(f => f.featureCode === dep);
          if (!depFeature) {
            errors.push({ feature: feature.featureCode, message: `Depends on missing feature "${dep}"` });
          }
        }
      }
    }
    const booleanFeatures = features.filter(f => f.type === 'boolean');
    const numericFeatures = features.filter(f => f.type === 'numeric');
    if (booleanFeatures.length === 0) warnings.push('No boolean features defined');
    if (numericFeatures.length === 0) warnings.push('No numeric features defined');
    return {
      editionId,
      editionName: edition.name,
      valid: errors.length === 0,
      totalFeatures: features.length,
      errors,
      warnings,
    };
  }
}

export const editionManagementService = new EditionManagementService();
