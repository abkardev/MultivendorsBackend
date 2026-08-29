import mongoose from 'mongoose';

const favoriteSupplierSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  notifyNewProducts: { type: Boolean, default: true },
  notifyPromotions: { type: Boolean, default: true },
  notifyAnnouncements: { type: Boolean, default: true },
}, { timestamps: true });

favoriteSupplierSchema.index({ user: 1, vendor: 1 }, { unique: true });
export default mongoose.model('FavoriteSupplier', favoriteSupplierSchema);
