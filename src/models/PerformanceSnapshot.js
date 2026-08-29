import mongoose from 'mongoose';

const performanceSnapshotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['hourly', 'daily', 'weekly', 'custom'], required: true },
  period: {
    start: { type: Date },
    end: { type: Date },
  },
  metrics: {
    avgLatency: { type: Number },
    p95Latency: { type: Number },
    p99Latency: { type: Number },
    throughput: { type: Number },
    errorRate: { type: Number },
    memoryUsage: { type: Number },
    cpuUsage: { type: Number },
    dbQueryTime: { type: Number },
    cacheHitRate: { type: Number },
    activeUsers: { type: Number },
    requestCount: { type: Number },
  },
  comparisons: {
    vsPrevious: { type: Number },
    vsBaseline: { type: Number },
  },
  budgets: {
    passed: { type: Number },
    warning: { type: Number },
    failed: { type: Number },
    total: { type: Number },
  },
  slowQueries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SlowQuery' }],
  recommendations: [{ type: String }],
  status: { type: String, enum: ['healthy', 'warning', 'critical'], default: 'healthy' },
  metadata: { type: Map, of: String },
}, { timestamps: true });

performanceSnapshotSchema.index({ type: 1, createdAt: -1 });
performanceSnapshotSchema.index({ status: 1 });
performanceSnapshotSchema.index({ 'period.start': 1, 'period.end': 1 });

export const PerformanceSnapshot = mongoose.model('PerformanceSnapshot', performanceSnapshotSchema);
