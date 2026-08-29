import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  type: { type: String, enum: ['commission', 'subscription', 'escrow_fee', 'transaction_fee', 'platform_fee', 'advertising', 'penalty', 'other'] },
  amount: { type: Number },
  currency: { type: String },
  reference: { type: String, enum: ['order', 'subscription', 'escrow'] },
  referenceId: { type: String },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
  status: { type: String, enum: ['pending', 'cleared', 'disputed', 'refunded'], default: 'pending' },
  clearedAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ type: 1 });
schema.index({ vendor: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });

export const MarketplaceRevenue = mongoose.model('MarketplaceRevenue', schema);
