import mongoose from 'mongoose';

const slowQuerySchema = new mongoose.Schema({
  query: { type: String, required: true },
  collection: { type: String, required: true },
  duration: { type: Number, required: true },
  operation: { type: String },
  pattern: { type: String },
  documentsExamined: { type: Number },
  documentsReturned: { type: Number },
  executionStats: { type: Object },
  explainPlan: { type: Object },
  indexUsed: { type: String },
  indexEfficient: { type: Boolean },
  frequency: { type: Number, default: 1 },
  firstSeen: { type: Date },
  lastSeen: { type: Date },
  normalizedQuery: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

slowQuerySchema.index({ collection: 1, duration: -1 });
slowQuerySchema.index({ pattern: 1 });
slowQuerySchema.index({ lastSeen: -1 });

export const SlowQuery = mongoose.model('SlowQuery', slowQuerySchema);
