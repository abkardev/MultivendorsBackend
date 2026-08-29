import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['community', 'starter', 'professional', 'enterprise', 'government', 'manufacturing', 'construction', 'healthcare', 'education'],
    required: true,
  },
  price: {
    monthly: { type: Number },
    yearly: { type: Number },
    lifetime: { type: Number },
    currency: { type: String },
  },
  maxUsers: { type: Number },
  maxStorage: { type: Number },
  maxApiCalls: { type: Number },
  maxTenants: { type: Number },
  features: [{
    feature: { type: String },
    enabled: { type: Boolean },
    limits: { type: mongoose.Schema.Types.Mixed },
    description: { type: String },
  }],
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });
schema.index({ isPublic: 1 });
schema.index({ sortOrder: 1 });

export const ProductEdition = mongoose.model('ProductEdition', schema);
