import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json', 'array'],
    default: 'string'
  },
  category: {
    type: String,
    default: 'general'
  },
  description: {
    type: String,
    default: ''
  },
  environment: {
    type: String,
    enum: ['all', 'development', 'staging', 'production'],
    default: 'all'
  },
  overrideable: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ key: 1 });
schema.index({ category: 1, isActive: 1 });
schema.index({ environment: 1 });

export const RuntimeSetting = mongoose.model('RuntimeSetting', schema);
