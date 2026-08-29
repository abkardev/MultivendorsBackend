import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  code: { type: String, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed', 'trial_extension'] },
  value: { type: Number },
  maxUses: { type: Number },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  appliesToPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' }],
  minBilling: { type: String, enum: ['monthly', 'quarterly', 'annual'] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ code: 1 });
schema.index({ isActive: 1 });
schema.index({ expiresAt: 1 });

export const SubscriptionCoupon = mongoose.model('SubscriptionCoupon', schema);
