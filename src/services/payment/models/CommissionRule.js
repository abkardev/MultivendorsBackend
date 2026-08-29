import mongoose from 'mongoose';

const commissionRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['subscription', 'country', 'category', 'vendor', 'campaign', 'promotional', 'custom'], required: true },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  conditions: {
    subscriptionPlan: { type: String, enum: ['starter', 'growth', 'pro', 'basic', 'premium'] },
    country: String,
    category: String,
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    minAmount: Number,
    maxAmount: Number,
    dateRange: {
      start: Date,
      end: Date,
    },
  },
  rate: { type: Number, required: true },
  type2: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const CommissionRule = mongoose.model('CommissionRule', commissionRuleSchema);
