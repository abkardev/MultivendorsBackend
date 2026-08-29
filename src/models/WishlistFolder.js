import mongoose from 'mongoose';

const wishlistFolderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 200 },
  description: String,
  icon: String,
  order: { type: Number, default: 0 },
}, { timestamps: true });

wishlistFolderSchema.index({ user: 1, order: 1 });
export default mongoose.model('WishlistFolder', wishlistFolderSchema);
