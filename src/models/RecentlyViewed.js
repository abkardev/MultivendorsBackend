import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, enum: ['product', 'vendor', 'factory', 'rfq'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { en: String, ar: String },
  image: String,
  url: String,
  viewedAt: { type: Date, default: Date.now },
});

recentlyViewedSchema.index({ user: 1, viewedAt: -1 });
recentlyViewedSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);
