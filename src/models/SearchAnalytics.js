import mongoose from 'mongoose';

const searchAnalyticsSchema = new mongoose.Schema({
  query: { type: String, required: true, trim: true },
  normalizedQuery: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: String,
  userAgent: String,
  locale: String,
  filters: { type: mongoose.Schema.Types.Mixed },
  resultsCount: { type: Number, default: 0 },
  totalResults: { type: Number, default: 0 },
  searchDurationMs: Number,
  clickedResults: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    position: Number,
    clickedAt: Date,
  }],
  hasResults: { type: Boolean, default: false },
  isAutocomplete: { type: Boolean, default: false },
  source: { type: String, enum: ['user', 'autocomplete', 'suggestion', 'api'], default: 'user' },
  sessionId: String,
}, { timestamps: true });

searchAnalyticsSchema.index({ query: 1, createdAt: -1 });
searchAnalyticsSchema.index({ normalizedQuery: 1 });
searchAnalyticsSchema.index({ createdAt: -1 });
searchAnalyticsSchema.index({ userId: 1, createdAt: -1 });
searchAnalyticsSchema.index({ hasResults: 1 });

export const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
