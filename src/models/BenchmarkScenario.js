import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['api', 'database', 'ai', 'search', 'procurement', 'marketplace', 'seller', 'buyer', 'comprehensive'], required: true },
  description: { type: String },
  endpoints: [{ type: String }],
  parameters: {
    concurrency: { type: Number },
    duration: { type: Number },
    rampUp: { type: Number },
    iterations: { type: Number },
    payload: { type: Object },
  },
  thresholds: {
    maxLatency: { type: Number },
    maxErrorRate: { type: Number },
    minThroughput: { type: Number },
  },
  status: { type: String, enum: ['draft', 'ready', 'running', 'completed', 'failed'], default: 'draft' },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const BenchmarkScenario = mongoose.model('BenchmarkScenario', schema);
