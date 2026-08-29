import { ExportReadiness } from '../models/ExportReadiness.js';

class ExportInternationalService {
  async assessExportReadiness(vendorId) {
    const { default: User } = await import('../models/userModel.js');
    const vendor = await User.findById(vendorId).select('name company country businessType').lean();
    if (!vendor) throw new Error('Vendor not found');
    const { Product } = await import('../models/productModel.js');
    const products = await Product.find({ vendor: vendorId, isActive: true });
    const productCount = products.length;
    const hasInternationalShipping = products.some(p => p.shipping?.international);
    const certifications = vendor.businessType || [];
    const hasBusinessLicense = true;
    const score = Math.min(100, Math.round(
      (productCount >= 10 ? 30 : (productCount / 10) * 30) +
      (hasInternationalShipping ? 25 : 0) +
      (certifications.length > 0 ? 15 : 0) +
      (hasBusinessLicense ? 20 : 0) +
      (vendor.country ? 10 : 0)
    ));
    let readinessLevel = 'beginner';
    if (score >= 80) readinessLevel = 'advanced';
    else if (score >= 50) readinessLevel = 'intermediate';
    else if (score >= 30) readinessLevel = 'developing';
    const recommendations = [];
    if (productCount < 10) recommendations.push('Add more products to reach at least 10 listings');
    if (!hasInternationalShipping) recommendations.push('Enable international shipping on your products');
    if (certifications.length === 0) recommendations.push('Obtain business certifications to increase buyer trust');
    if (!vendor.country) recommendations.push('Complete your business profile with country information');
    const existing = await ExportReadiness.findOne({ vendor: vendorId });
    const data = {
      vendor: vendorId,
      score,
      readinessLevel,
      criteria: {
        productCount,
        hasInternationalShipping,
        certifications: certifications.length,
        hasBusinessLicense,
        hasProfileInfo: !!vendor.country,
        hasTradeDocuments: false,
      },
      recommendations,
      lastAssessed: new Date(),
    };
    if (existing) {
      await ExportReadiness.findOneAndUpdate({ _id: existing._id }, { $set: data });
      return ExportReadiness.findById(existing._id);
    }
    return ExportReadiness.create(data);
  }

  async getExportReadiness(vendorId) {
    let readiness = await ExportReadiness.findOne({ vendor: vendorId });
    if (!readiness) {
      return this.assessExportReadiness(vendorId);
    }
    return readiness;
  }

  async getExportOpportunities(vendorId) {
    const { Product } = await import('../models/productModel.js');
    const products = await Product.find({ vendor: vendorId, isActive: true }).select('name category price');
    const categories = [...new Set(products.filter(p => p.category).map(p => p.category))];
    const readiness = await this.getExportReadiness(vendorId);
    return {
      categories,
      productCount: products.length,
      readinessLevel: readiness.readinessLevel,
      score: readiness.score,
      opportunities: [
        { region: 'Middle East', potential: 'high', reason: 'Cultural and trade proximity' },
        { region: 'North Africa', potential: 'medium', reason: 'Growing demand in your category' },
        { region: 'Southeast Asia', potential: 'medium', reason: 'Trade agreement benefits' },
        { region: 'Europe', potential: 'low', reason: 'Requires additional certifications' },
      ],
    };
  }

  async updateExportReadiness(vendorId, data) {
    return ExportReadiness.findOneAndUpdate({ vendor: vendorId }, { $set: data }, { new: true, upsert: true });
  }
}

export const exportInternationalService = new ExportInternationalService();
