import mongoose from 'mongoose';

const productCollectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 200 },
  description: String,
  visibility: { type: String, enum: ['private', 'shared', 'team'], default: 'private' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  coverImage: String,
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

productCollectionSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model('ProductCollection', productCollectionSchema);
