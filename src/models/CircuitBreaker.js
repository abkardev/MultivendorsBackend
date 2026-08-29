import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  service: { type: String, required: true },
  state: { type: String, enum: ['closed', 'open', 'half_open', 'disabled'], default: 'closed' },
  failureCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureThreshold: { type: Number, default: 5 },
  successThreshold: { type: Number, default: 3 },
  timeout: { type: Number, default: 30000 },
  halfOpenTimeout: { type: Number, default: 10000 },
  lastFailure: { type: Date },
  lastSuccess: { type: Date },
  lastStateChange: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ name: 1 });
schema.index({ service: 1 });
schema.index({ state: 1 });

export const CircuitBreaker = mongoose.model('CircuitBreaker', schema);
