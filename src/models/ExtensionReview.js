import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  extension: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceExtension', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  review: { type: String },
  pros: { type: String },
  cons: { type: String },
  version: { type: String },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ extension: 1, user: 1 }, { unique: true });
schema.index({ extension: 1 });
schema.index({ user: 1 });
schema.index({ rating: -1 });
schema.index({ extension: 1, isActive: 1 });

export const ExtensionReview = mongoose.model('ExtensionReview', schema);
