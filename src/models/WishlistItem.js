import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  wishlist: { type: mongoose.Schema.Types.ObjectId, ref: 'WishlistFolder' },
  notes: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
}, { timestamps: true });

wishlistItemSchema.index({ user: 1, product: 1 }, { unique: true });
wishlistItemSchema.index({ wishlist: 1 });

export default mongoose.models.WishlistItem || mongoose.model('WishlistItem', wishlistItemSchema);
