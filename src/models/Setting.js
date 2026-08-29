import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json', 'array'],
    default: 'string',
  },
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
      'general', 'marketplace', 'verification', 'notifications',
      'payment', 'shipping', 'commission', 'security',
      'email', 'integration', 'localization', 'feature',
    ],
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  isEncrypted: {
    type: Boolean,
    default: false,
  },
  options: [{
    label: { en: String, ar: String },
    value: String,
  }],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    required: Boolean,
  },
}, { timestamps: true });

settingSchema.index({ category: 1, key: 1 });
settingSchema.index({ isPublic: 1 });

export const Setting = mongoose.model('Setting', settingSchema);
