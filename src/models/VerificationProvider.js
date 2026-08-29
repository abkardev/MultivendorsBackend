import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  type: {
    type: String,
    enum: ['manual', 'ocr', 'ai', 'government', 'third_party', 'hybrid'],
    required: true,
  },
  providerClass: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  supportedDocTypes: [String],
  supportedCountries: [String],
  config: {
    endpointUrl: String,
    apiKey: String,
    apiVersion: String,
    timeout: { type: Number, default: 30000 },
    retryCount: { type: Number, default: 3 },
    rateLimit: { type: Number, default: 100 },
    webhookUrl: String,
  },
  capabilities: {
    canVerifyRegistration: { type: Boolean, default: false },
    canVerifyVAT: { type: Boolean, default: false },
    canVerifyAddress: { type: Boolean, default: false },
    canVerifyLicense: { type: Boolean, default: false },
    canVerifyCertificates: { type: Boolean, default: false },
    canBlacklistCheck: { type: Boolean, default: false },
    canContinuousMonitoring: { type: Boolean, default: false },
    supportsOcr: { type: Boolean, default: false },
    supportsAiValidation: { type: Boolean, default: false },
  },
  healthCheck: {
    lastChecked: Date,
    isHealthy: { type: Boolean, default: true },
    lastError: String,
    uptime: { type: Number, default: 100 },
  },
  stats: {
    totalVerifications: { type: Number, default: 0 },
    successfulVerifications: { type: Number, default: 0 },
    failedVerifications: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
  },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

providerSchema.index({ type: 1, isActive: 1 });
providerSchema.index({ priority: -1 });

export const VerificationProvider = mongoose.model('VerificationProvider', providerSchema);
