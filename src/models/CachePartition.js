import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['hot', 'warm', 'cold', 'replica'], default: 'hot' },
  strategy: { type: String, enum: ['lru', 'lfu', 'ttl', 'fifo'], default: 'lru' },
  capacity: { type: Number },
  size: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  hitRate: { type: Number, default: 0 },
  missRate: { type: Number, default: 0 },
  evictions: { type: Number, default: 0 },
  ttls: {
    default: { type: Number },
    min: { type: Number },
    max: { type: Number },
  },
  tags: [{ type: String }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ strategy: 1 });

export const CachePartition = mongoose.model('CachePartition', schema);
