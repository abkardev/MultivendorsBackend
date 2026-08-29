import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  service: { type: String, required: true, unique: true },
  type: { type: String, enum: ['api', 'worker', 'database', 'cache', 'queue', 'ai', 'search'], required: true },
  status: { type: String, enum: ['healthy', 'degraded', 'down', 'maintenance'], default: 'healthy' },
  dependencies: [{
    service: { type: String },
    type: { type: String },
    critical: { type: Boolean },
    status: { type: String },
    latency: { type: Number },
    lastChecked: { type: Date },
  }],
  dependents: [{ type: String }],
  metrics: {
    latency: { type: Number },
    throughput: { type: Number },
    errorRate: { type: Number },
    availability: { type: Number },
  },
  instances: { type: Number, default: 1 },
  region: { type: String },
  version: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ service: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const ServiceTopology = mongoose.model('ServiceTopology', schema);
