import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  partition: { type: mongoose.Schema.Types.ObjectId, ref: 'CachePartition' },
  pattern: { type: String },
  ttl: { type: Number, required: true },
  priority: { type: Number, default: 0 },
  warmup: { type: Boolean, default: false },
  dependencies: [{ type: String }],
  invalidateOn: [{ type: String }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ partition: 1 });
schema.index({ pattern: 1 });
schema.index({ isActive: 1 });

export const CachePolicy = mongoose.model('CachePolicy', schema);
