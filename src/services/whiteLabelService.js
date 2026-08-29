import mongoose from 'mongoose';
import { WhiteLabelBrand } from '../models/WhiteLabelBrand.js';
import { BrandTheme } from '../models/BrandTheme.js';
import { CustomDomain } from '../models/CustomDomain.js';
import { BrandAsset } from '../models/BrandAsset.js';
import { TenantBrandSettings } from '../models/TenantBrandSettings.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class WhiteLabelService {
  async createBrand(data) {
    const brand = await WhiteLabelBrand.create(data);
    await logAuditEvent({
      action: 'whitelabel.brand.create', category: 'whitelabel',
      entityType: 'WhiteLabelBrand', entityId: brand._id,
      newValue: { name: brand.name, code: brand.code },
      description: `White label brand "${brand.name}" created`,
    });
    return brand;
  }

  async updateBrand(id, data) {
    const brand = await WhiteLabelBrand.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!brand) throw new Error('Brand not found');
    await logAuditEvent({
      action: 'whitelabel.brand.update', category: 'whitelabel',
      entityType: 'WhiteLabelBrand', entityId: id,
      newValue: data,
      description: `Brand "${brand.name}" updated`,
    });
    return brand;
  }

  async getBrand(id) {
    const brand = await WhiteLabelBrand.findById(id)
      .populate('createdBy', 'name email')
      .lean();
    if (!brand) throw new Error('Brand not found');
    const [themes, domains, assets] = await Promise.all([
      BrandTheme.find({ brand: id, isActive: true }).lean(),
      CustomDomain.find({ brand: id, isActive: true }).lean(),
      BrandAsset.find({ brand: id }).lean(),
    ]);
    return { ...brand, themes, domains, assets };
  }

  async listBrands(filter = {}) {
    const { page = 1, limit = 20, isActive, search } = filter;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WhiteLabelBrand.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      WhiteLabelBrand.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async deleteBrand(id) {
    const brand = await WhiteLabelBrand.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!brand) throw new Error('Brand not found');
    await Promise.all([
      BrandTheme.updateMany({ brand: id }, { $set: { isActive: false } }),
      CustomDomain.updateMany({ brand: id }, { $set: { isActive: false } }),
    ]);
    await logAuditEvent({
      action: 'whitelabel.brand.delete', category: 'whitelabel',
      entityType: 'WhiteLabelBrand', entityId: id,
      oldValue: { name: brand.name, code: brand.code },
      description: `Brand "${brand.name}" soft deleted`,
    });
    return { message: 'Brand deleted' };
  }

  async setDefaultBrand(id) {
    await WhiteLabelBrand.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    const brand = await WhiteLabelBrand.findByIdAndUpdate(id, { $set: { isDefault: true } }, { new: true });
    if (!brand) throw new Error('Brand not found');
    await logAuditEvent({
      action: 'whitelabel.brand.set_default', category: 'whitelabel',
      entityType: 'WhiteLabelBrand', entityId: id,
      newValue: { name: brand.name },
      description: `Brand "${brand.name}" set as default`,
    });
    return brand;
  }

  async duplicateBrand(id) {
    const source = await WhiteLabelBrand.findById(id).lean();
    if (!source) throw new Error('Brand not found');
    const { _id, createdAt, updatedAt, isDefault, ...data } = source;
    data.name = `${data.name} (Copy)`;
    data.code = `${data.code}_copy_${Date.now()}`;
    data.isDefault = false;
    const brand = await WhiteLabelBrand.create(data);
    const [themes, domains, assets] = await Promise.all([
      BrandTheme.find({ brand: id }).lean(),
      CustomDomain.find({ brand: id }).lean(),
      BrandAsset.find({ brand: id }).lean(),
    ]);
    if (themes.length > 0) {
      await BrandTheme.insertMany(themes.map(t => {
        const { _id: tid, createdAt: tc, updatedAt: tu, ...rest } = t;
        return { ...rest, brand: brand._id, name: `${rest.name} (Copy)`, isDefault: false };
      }));
    }
    if (domains.length > 0) {
      await CustomDomain.insertMany(domains.map(d => {
        const { _id: did, createdAt: dc, updatedAt: du, ...rest } = d;
        return { ...rest, brand: brand._id, isPrimary: false };
      }));
    }
    if (assets.length > 0) {
      await BrandAsset.insertMany(assets.map(a => {
        const { _id: aid, createdAt: ac, updatedAt: au, ...rest } = a;
        return { ...rest, brand: brand._id };
      }));
    }
    await logAuditEvent({
      action: 'whitelabel.brand.duplicate', category: 'whitelabel',
      entityType: 'WhiteLabelBrand', entityId: brand._id,
      newValue: { name: brand.name, sourceId: id },
      description: `Brand "${source.name}" duplicated as "${brand.name}"`,
    });
    return brand;
  }

  async getBrandByDomain(domain) {
    const customDomain = await CustomDomain.findOne({ domain, isActive: true }).populate('brand').lean();
    if (!customDomain) throw new Error('Domain not found');
    return customDomain;
  }

  async verifyDomain(id) {
    const domain = await CustomDomain.findByIdAndUpdate(id, {
      $set: { verificationStatus: 'verified', lastVerifiedAt: new Date() },
    }, { new: true });
    if (!domain) throw new Error('Domain not found');
    await logAuditEvent({
      action: 'whitelabel.domain.verify', category: 'whitelabel',
      entityType: 'CustomDomain', entityId: id,
      newValue: { domain: domain.domain, verificationStatus: 'verified' },
      description: `Domain "${domain.domain}" verified`,
    });
    return domain;
  }

  async uploadAsset(brandId, assetData) {
    const asset = await BrandAsset.create({ ...assetData, brand: brandId });
    await logAuditEvent({
      action: 'whitelabel.asset.upload', category: 'whitelabel',
      entityType: 'BrandAsset', entityId: asset._id,
      newValue: { name: asset.name, type: asset.type, brand: brandId },
      description: `Asset "${asset.name}" uploaded for brand ${brandId}`,
    });
    return asset;
  }

  async listAssets(brandId, type) {
    const filter = { brand: brandId };
    if (type) filter.type = type;
    return BrandAsset.find(filter).sort({ createdAt: -1 }).lean();
  }

  async deleteAsset(id) {
    const asset = await BrandAsset.findByIdAndDelete(id);
    if (!asset) throw new Error('Asset not found');
    await logAuditEvent({
      action: 'whitelabel.asset.delete', category: 'whitelabel',
      entityType: 'BrandAsset', entityId: id,
      oldValue: { name: asset.name, type: asset.type },
      description: `Asset "${asset.name}" deleted`,
    });
    return { message: 'Asset deleted' };
  }

  async createTheme(data) {
    const theme = await BrandTheme.create(data);
    await logAuditEvent({
      action: 'whitelabel.theme.create', category: 'whitelabel',
      entityType: 'BrandTheme', entityId: theme._id,
      newValue: { name: theme.name, brand: theme.brand },
      description: `Brand theme "${theme.name}" created`,
    });
    return theme;
  }

  async updateTheme(id, data) {
    const theme = await BrandTheme.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!theme) throw new Error('Theme not found');
    await logAuditEvent({
      action: 'whitelabel.theme.update', category: 'whitelabel',
      entityType: 'BrandTheme', entityId: id,
      newValue: data,
      description: `Theme "${theme.name}" updated`,
    });
    return theme;
  }

  async listThemes(brandId) {
    return BrandTheme.find({ brand: brandId, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async setDefaultTheme(id) {
    const theme = await BrandTheme.findById(id);
    if (!theme) throw new Error('Theme not found');
    await BrandTheme.updateMany({ brand: theme.brand, isDefault: true }, { $set: { isDefault: false } });
    theme.isDefault = true;
    await theme.save();
    await logAuditEvent({
      action: 'whitelabel.theme.set_default', category: 'whitelabel',
      entityType: 'BrandTheme', entityId: id,
      description: `Theme "${theme.name}" set as default for brand ${theme.brand}`,
    });
    return theme;
  }

  async applyBranding(request) {
    const { tenantId, domain } = request;
    let brand = null;
    if (domain) {
      const domainDoc = await CustomDomain.findOne({ domain, isActive: true }).lean();
      if (domainDoc) brand = await WhiteLabelBrand.findById(domainDoc.brand).lean();
    }
    if (!brand && tenantId) {
      const settings = await TenantBrandSettings.findOne({ tenant: tenantId, isActive: true })
        .populate('brand').populate('theme').lean();
      if (settings) {
        const result = { settings };
        if (settings.brand) result.brand = settings.brand;
        if (settings.theme) result.theme = settings.theme;
        if (settings.customDomain) {
          result.domain = await CustomDomain.findById(settings.customDomain).lean();
        }
        return result;
      }
      brand = await WhiteLabelBrand.findOne({ isDefault: true, isActive: true }).lean();
    }
    if (!brand) return { brand: null, theme: null, domain: null };
    const theme = await BrandTheme.findOne({ brand: brand._id, isDefault: true, isActive: true }).lean();
    return { brand, theme, domain: null };
  }

  async getBrandingCSS(brandId, themeId) {
    const brand = await WhiteLabelBrand.findById(brandId).lean();
    if (!brand) throw new Error('Brand not found');
    const theme = themeId
      ? await BrandTheme.findById(themeId).lean()
      : await BrandTheme.findOne({ brand: brandId, isDefault: true, isActive: true }).lean();
    const vars = [];
    if (brand.colors) {
      for (const [key, val] of Object.entries(brand.colors)) {
        if (val) vars.push(`--color-${key}: ${val};`);
      }
    }
    if (theme && theme.colors) {
      for (const [key, val] of Object.entries(theme.colors)) {
        if (val) vars.push(`--theme-${key}: ${val};`);
      }
    }
    if (brand.typography?.fontFamily) vars.push(`--font-family: ${brand.typography.fontFamily};`);
    if (brand.typography?.headingFont) vars.push(`--heading-font: ${brand.typography.headingFont};`);
    if (brand.typography?.baseSize) vars.push(`--base-size: ${brand.typography.baseSize};`);
    if (theme && theme.typography) {
      if (theme.typography.fontFamily) vars.push(`--theme-font-family: ${theme.typography.fontFamily};`);
      if (theme.typography.headingFont) vars.push(`--theme-heading-font: ${theme.typography.headingFont};`);
    }
    if (brand.cssVariables) {
      for (const [key, val] of brand.cssVariables) {
        vars.push(`--${key}: ${val};`);
      }
    }
    return `:root {\n  ${vars.join('\n  ')}\n}`;
  }

  async validateBrand(brandId) {
    const brand = await WhiteLabelBrand.findById(brandId).lean();
    if (!brand) throw new Error('Brand not found');
    const [assets, domains, themes, tenantSettings] = await Promise.all([
      BrandAsset.find({ brand: brandId }).lean(),
      CustomDomain.find({ brand: brandId }).lean(),
      BrandTheme.find({ brand: brandId, isActive: true }).lean(),
      TenantBrandSettings.find({ brand: brandId }).lean(),
    ]);
    const warnings = [];
    const errors = [];
    if (!brand.logo) warnings.push('No logo uploaded');
    if (!brand.favicon) warnings.push('No favicon uploaded');
    if (domains.length === 0) warnings.push('No custom domains configured');
    const unverifiedDomains = domains.filter(d => d.verificationStatus !== 'verified');
    if (unverifiedDomains.length > 0) warnings.push(`${unverifiedDomains.length} domain(s) not verified`);
    if (themes.length === 0) errors.push('No themes configured');
    if (!themes.some(t => t.isDefault)) warnings.push('No default theme set');
    if (assets.length === 0) warnings.push('No brand assets uploaded');
    const hasDefault = domains.some(d => d.isPrimary);
    if (domains.length > 0 && !hasDefault) warnings.push('No primary domain set');
    return {
      brand: brand._id,
      name: brand.name,
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors,
      warnings,
      stats: { assets: assets.length, domains: domains.length, themes: themes.length, tenantSettings: tenantSettings.length },
    };
  }

  async getTenantSettings(tenantId) {
    let settings = await TenantBrandSettings.findOne({ tenant: tenantId, isActive: true })
      .populate('brand').populate('theme').populate('customDomain').lean();
    if (!settings) {
      const defaultBrand = await WhiteLabelBrand.findOne({ isDefault: true, isActive: true }).lean();
      const defaultTheme = defaultBrand
        ? await BrandTheme.findOne({ brand: defaultBrand._id, isDefault: true, isActive: true }).lean()
        : null;
      settings = {
        tenant: tenantId,
        brand: defaultBrand || null,
        theme: defaultTheme || null,
        customDomain: null,
        settings: { useDefaultBranding: true },
      };
    }
    return settings;
  }

  async updateTenantSettings(tenantId, data) {
    const settings = await TenantBrandSettings.findOneAndUpdate(
      { tenant: tenantId },
      { $set: { ...data, tenant: tenantId } },
      { upsert: true, new: true, runValidators: true }
    );
    await logAuditEvent({
      action: 'whitelabel.tenant_settings.update', category: 'whitelabel',
      entityType: 'TenantBrandSettings', entityId: settings._id,
      newValue: { tenant: tenantId, ...data },
      description: `Brand settings updated for tenant ${tenantId}`,
    });
    return settings;
  }
}

export const whiteLabelService = new WhiteLabelService();
