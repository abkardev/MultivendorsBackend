import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed },
  type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'array', 'secret'], default: 'string' },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  description: {
    en: String,
    ar: String,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'marketplace', 'procurement', 'reputation', 'ranking', 'rfq',
      'ai', 'commerce_intelligence', 'executive_intelligence',
      'autonomous_procurement', 'agent_orchestration',
      'scheduler', 'notifications', 'payments', 'escrow', 'wallet',
      'shipment', 'email', 'sms', 'storage', 'cdn', 'cache',
      'search', 'security', 'general',
    ],
  },
  group: { type: String },
  version: { type: Number, default: 1 },
  isPublic: { type: Boolean, default: false },
  isEncrypted: { type: Boolean, default: false },
  environmentOverrides: {
    development: { type: mongoose.Schema.Types.Mixed },
    staging: { type: mongoose.Schema.Types.Mixed },
    production: { type: mongoose.Schema.Types.Mixed },
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    required: Boolean,
    enumValues: [String],
  },
  options: [{
    label: { en: String, ar: String },
    value: String,
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

platformSettingSchema.index({ key: 1, version: 1 }, { unique: true });
platformSettingSchema.index({ category: 1, group: 1 });
platformSettingSchema.index({ isActive: 1 });

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
