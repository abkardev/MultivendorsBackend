import mongoose from 'mongoose';

const exportReadinessSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
  readinessScore: { type: Number, min: 0, max: 100, default: 0 },
  supportedCountries: [{
    country: { type: String },
    status: { type: String, enum: ['ready', 'pending', 'not_ready'] },
    requirements: [{ requirement: String, met: Boolean }],
    certifications: [String],
    customsInfo: String,
    restrictions: [String],
  }],
  tradeCompliance: {
    taxId: String,
    exportLicense: String,
    tradeRegistryNumber: String,
    complianceStatus: { type: String, enum: ['compliant', 'partial', 'non_compliant'] },
    lastReviewedAt: Date,
  },
  requiredCertifications: [{
    name: String,
    description: String,
    isRequired: { type: Boolean, default: false },
    countries: [String],
  }],
  recommendedDocuments: [{
    name: String,
    description: String,
    required: { type: Boolean, default: false },
    countries: [String],
  }],
  hsCodes: [{
    code: String,
    description: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    dutyRate: Number,
    restrictions: [String],
  }],
  exportOpportunities: [{
    country: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    estimatedDemand: { type: String, enum: ['high', 'medium', 'low'] },
    competition: { type: String, enum: ['high', 'medium', 'low'] },
    recommendation: String,
  }],
  internationalRfqs: { type: Number, default: 0 },
  lastCalculatedAt: Date,
}, { timestamps: true });

export const ExportReadiness = mongoose.model('ExportReadiness', exportReadinessSchema);
