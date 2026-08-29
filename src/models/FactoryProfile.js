import mongoose from 'mongoose';

const factoryProfileSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  factoryName: { en: String, ar: String },
  factoryAddress: { street: String, city: String, state: String, country: String, zip: String },
  factorySize: { type: String, enum: ['small', 'medium', 'large', 'enterprise'] },
  establishedYear: Number,
  employeeCount: Number,
  companyHistory: { en: String, ar: String },
  productionLines: [{
    name: String, description: String, capacity: String, products: [String],
  }],
  machines: [{
    name: String, brand: String, model: String, quantity: Number, specifications: String,
  }],
  workingHours: {
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
  },
  videos: [{ url: String, label: String, thumbnail: String }],
  certifications: [{
    name: String, issuer: String, issueDate: Date, expiryDate: Date, fileUrl: String, verified: Boolean,
  }],
  productionCapacity: [{
    product: String, monthlyCapacity: Number, unit: String, moq: Number, leadTimeDays: Number,
  }],
  exportMarkets: [String],
  languages: [String],
  facilities: [String],
  qualityStandards: [String],
  images: [{ url: String, label: String }],
  manufacturingProcess: String,
  mainMachinery: [String],
  productionWorkflow: String,
  factoryAdvantages: [String],
  sustainabilityPractices: [String],
  environmentalCertifications: [String],
  safetyCertifications: [String],
  factoryTimeline: [{
    year: Number,
    event: String,
    description: String,
  }],
  virtualTourUrl: String,
  latitude: Number,
  longitude: Number,
  scoring: {
    overall: { type: Number, default: 0 },
    delivery: { type: Number, default: 0 },
    quality: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    compliance: { type: Number, default: 0 },
    lastCalculated: Date,
  },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
}, { timestamps: true });

factoryProfileSchema.index({ isVerified: 1, 'scoring.overall': -1 });
factoryProfileSchema.index({ 'factoryAddress.country': 1 });
factoryProfileSchema.index({ factorySize: 1 });
factoryProfileSchema.index({ isVerified: 1, createdAt: -1 });

export const FactoryProfile = mongoose.model('FactoryProfile', factoryProfileSchema);
