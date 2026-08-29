import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  scenario: { type: mongoose.Schema.Types.ObjectId, ref: 'BenchmarkScenario' },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  results: {
    totalRequests: { type: Number },
    successfulRequests: { type: Number },
    failedRequests: { type: Number },
    avgLatency: { type: Number },
    p50Latency: { type: Number },
    p95Latency: { type: Number },
    p99Latency: { type: Number },
    throughput: { type: Number },
    errorRate: { type: Number },
    concurrency: { type: Number },
  },
  comparisons: {
    vsPrevious: { type: Object },
    vsBaseline: { type: Object },
    vsThreshold: { type: Object },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ scenario: 1 });
schema.index({ status: 1 });
schema.index({ createdAt: -1 });

export const BenchmarkExecution = mongoose.model('BenchmarkExecution', schema);
