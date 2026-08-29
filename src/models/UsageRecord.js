import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  metrics: {
    products: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    rfqs: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    aiQueries: { type: Number, default: 0 },
    users: { type: Number, default: 0 },
    bandwidth: { type: Number, default: 0 }
  },
  overageAmount: { type: Number, default: 0 },
  currency: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ vendor: 1 });
schema.index({ plan: 1 });
schema.index({ periodStart: 1, periodEnd: 1 });
schema.index({ isActive: 1 });

export const UsageRecord = mongoose.model('UsageRecord', schema);
