import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  service: { type: String },
  operation: { type: String },
  maxAttempts: { type: Number, default: 3 },
  initialDelay: { type: Number, default: 1000 },
  maxDelay: { type: Number, default: 30000 },
  backoffMultiplier: { type: Number, default: 2 },
  retryableErrors: [{ type: String }],
  jitter: { type: Boolean, default: true },
  timeout: { type: Number, default: 30000 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ name: 1 });
schema.index({ service: 1 });
schema.index({ isActive: 1 });

export const RetryPolicy = mongoose.model('RetryPolicy', schema);
