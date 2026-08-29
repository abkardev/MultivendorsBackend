import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, required: true },
  type: { type: String, enum: ['product', 'supplier', 'rfq', 'ai'], default: 'product' },
  filters: { type: mongoose.Schema.Types.Mixed },
  resultCount: Number,
  createdAt: { type: Date, default: Date.now },
});

searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, query: 1 });

export default mongoose.model('SearchHistory', searchHistorySchema);
