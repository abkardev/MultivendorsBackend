import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  docType: { type: String, required: true },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  required: { type: Boolean, default: true },
  weight: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  validationRules: [{
    field: String,
    rule: String,
    message: { en: String, ar: String },
  }],
  acceptsExpiry: { type: Boolean, default: false },
  expiryRequired: { type: Boolean, default: false },
  renewPeriodDays: Number,
}, { _id: false });

const complianceChecklistSchema = new mongoose.Schema({
  country: { type: String, required: true },
  countryName: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  items: [checklistItemSchema],
  scoringRules: {
    maxTotalScore: { type: Number, default: 100 },
    thresholds: {
      fullyVerified: { type: Number, default: 90 },
      conditionallyVerified: { type: Number, default: 70 },
      requiresReview: { type: Number, default: 50 },
      rejected: { type: Number, default: 0 },
    },
  },
  providerConfig: {
    preferredProvider: String,
    fallbackProviders: [String],
  },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

complianceChecklistSchema.index({ country: 1 }, { unique: true });
complianceChecklistSchema.index({ isDefault: 1 });
complianceChecklistSchema.index({ isActive: 1 });

export const ComplianceChecklist = mongoose.model('ComplianceChecklist', complianceChecklistSchema);
