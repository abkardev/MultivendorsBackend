import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String },
  code: { type: String, unique: true },
  description: { type: String },
  type: { type: String, enum: ['free', 'basic', 'pro', 'enterprise', 'custom'] },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  billing: { type: String, enum: ['monthly', 'quarterly', 'annual', 'custom'] },
  price: { type: Number },
  currency: { type: String },
  setupFee: { type: Number, default: 0 },
  trialDays: { type: Number, default: 0 },
  features: [{
    key: { type: String },
    value: { type: String },
    enabled: { type: Boolean, default: true }
  }],
  limits: {
    products: { type: Number },
    orders: { type: Number },
    rfqs: { type: Number },
    storage: { type: Number },
    apiCalls: { type: Number },
    aiQueries: { type: Number },
    users: { type: Number },
    teams: { type: Number }
  },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ code: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ isFeatured: 1 });
schema.index({ isActive: 1 });

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', schema);
