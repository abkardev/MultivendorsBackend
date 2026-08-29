import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['plugin', 'theme', 'template', 'ai_agent', 'workflow', 'automation', 'integration'],
    required: true,
  },
  version: { type: String, required: true },
  minPlatformVersion: { type: String },
  maxPlatformVersion: { type: String },
  author: { type: String },
  website: { type: String },
  license: { type: String },
  price: {
    amount: { type: Number },
    currency: { type: String },
    type: { type: String },
  },
  icon: { type: String },
  screenshots: [{ type: String }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExtensionCategory' }],
  tags: [{ type: String }],
  dependencies: [{
    code: { type: String },
    version: { type: String },
    required: { type: Boolean },
  }],
  compatibility: [{
    edition: { type: String },
    version: { type: String },
    compatible: { type: Boolean },
  }],
  features: [{ type: String }],
  permissions: [{
    permission: { type: String },
    description: { type: String },
    required: { type: Boolean },
  }],
  configuration: {
    fields: [{
      name: { type: String },
      type: { type: String },
      label: { type: String },
      required: { type: Boolean },
      defaultValue: { type: Object },
    }],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'published', 'archived'],
    default: 'pending',
  },
  isActive: { type: Boolean, default: true },
  isPaid: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });
schema.index({ categories: 1 });
schema.index({ type: 1, status: 1 });
schema.index({ rating: -1 });

export const MarketplaceExtension = mongoose.model('MarketplaceExtension', schema);
