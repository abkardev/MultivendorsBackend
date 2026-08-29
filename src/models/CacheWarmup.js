import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  partition: { type: mongoose.Schema.Types.ObjectId, ref: 'CachePartition' },
  pattern: { type: String, required: true },
  queries: [{
    collection: { type: String },
    query: { type: Object },
    options: { type: Object },
  }],
  schedule: { type: String },
  status: { type: String, enum: ['pending', 'warming', 'completed', 'failed'], default: 'pending' },
  progress: { type: Number, default: 0 },
  itemsCached: { type: Number, default: 0 },
  duration: { type: Number },
  lastWarmed: { type: Date },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ partition: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });

export const CacheWarmup = mongoose.model('CacheWarmup', schema);
