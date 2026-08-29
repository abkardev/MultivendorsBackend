import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  service: { type: String, required: true },
  type: { type: String, enum: ['semaphore', 'thread_pool', 'queue'], default: 'semaphore' },
  maxConcurrent: { type: Number, default: 10 },
  maxQueue: { type: Number, default: 100 },
  queueTimeout: { type: Number, default: 10000 },
  currentLoad: { type: Number, default: 0 },
  rejectedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ name: 1 });
schema.index({ service: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const BulkheadPolicy = mongoose.model('BulkheadPolicy', schema);
