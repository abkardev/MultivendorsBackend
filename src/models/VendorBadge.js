import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  badge: {
    type: String,
    enum: [
      'verified_supplier', 'factory_verified', 'premium_supplier', 'top_rated',
      'fast_response', 'export_expert', 'oem_manufacturer', 'odm_manufacturer',
      'private_label', 'gold_supplier', 'trusted_manufacturer', 'quality_certified',
      'iso_certified', 'high_capacity', 'low_dispute_rate', 'fast_shipping',
    ],
    required: true,
  },
  awardedAt: { type: Date, default: Date.now },
  awardedBy: { type: String, enum: ['auto', 'admin'], default: 'auto' },
  awardedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  reason: String,
  expiresAt: Date,
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokeReason: String,
}, { timestamps: true });

badgeSchema.index({ vendor: 1, badge: 1 }, { unique: true });
badgeSchema.index({ vendor: 1, isActive: 1 });
badgeSchema.index({ badge: 1, isActive: 1 });

export default mongoose.model('VendorBadge', badgeSchema);
