import mongoose from 'mongoose';

const extractedDataSchema = new mongoose.Schema({
  registrationNumber: String,
  companyName: String,
  taxNumber: String,
  vatNumber: String,
  nationalAddress: String,
  issueDate: Date,
  expiryDate: Date,
  documentType: String,
  issuingAuthority: String,
}, { _id: false });

const validationResultSchema = new mongoose.Schema({
  field: { type: String, required: true },
  status: { type: String, enum: ['passed', 'failed', 'warning', 'skipped'], default: 'passed' },
  message: { en: String, ar: String },
  confidence: { type: Number, min: 0, max: 100 },
}, { _id: false });

const verificationAttemptSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'error'], default: 'pending' },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  result: mongoose.Schema.Types.Mixed,
  error: String,
  duration: Number,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const documentVerificationSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  docType: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'verified', 'rejected', 'expired'], default: 'pending' },
  ocrStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  ocrConfidence: { type: Number, min: 0, max: 100, default: 0 },
  extractedData: extractedDataSchema,
  validationResults: [validationResultSchema],
  validationScore: { type: Number, min: 0, max: 100, default: 0 },
  verificationAttempts: [verificationAttemptSchema],
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  notes: String,
  isExpired: { type: Boolean, default: false },
  expiryDate: Date,
  notifiedDaysBefore: [Number],
}, { timestamps: true });

const complianceScoreSchema = new mongoose.Schema({
  total: { type: Number, min: 0, max: 100, default: 0 },
  commercialRegistration: { type: Number, default: 0, max: 30 },
  vatCertificate: { type: Number, default: 0, max: 20 },
  nationalAddress: { type: Number, default: 0, max: 15 },
  factoryLicense: { type: Number, default: 0, max: 20 },
  isoCertifications: { type: Number, default: 0, max: 10 },
  additionalCertifications: { type: Number, default: 0, max: 5 },
  lastCalculated: Date,
  breakdown: [{
    category: String,
    weight: Number,
    score: Number,
    maxScore: Number,
    details: String,
  }],
}, { _id: false });

const complianceVerificationSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['unverified', 'pending_documents', 'pending_review', 'verified', 'conditionally_verified', 'rejected', 'expired'],
    default: 'unverified',
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'uncalculated'],
    default: 'uncalculated',
  },
  score: complianceScoreSchema,
  documents: [documentVerificationSchema],
  badge: {
    type: String,
    enum: ['none', 'verified_saudi_factory', 'verified_supplier', 'trusted_partner'],
    default: 'none',
  },
  badgeAssignedAt: Date,
  badgeExpiresAt: Date,
  badgeAssignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentProvider: { type: String, default: 'manual' },
  verifiedAt: Date,
  expiresAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

complianceVerificationSchema.index({ vendor: 1 }, { unique: true });
complianceVerificationSchema.index({ status: 1 });
complianceVerificationSchema.index({ riskLevel: 1 });
complianceVerificationSchema.index({ 'score.total': -1 });
complianceVerificationSchema.index({ badge: 1 });
complianceVerificationSchema.index({ status: 1, createdAt: -1 });
complianceVerificationSchema.index({ badge: 1, status: 1 });

export const ComplianceVerification = mongoose.model('ComplianceVerification', complianceVerificationSchema);
