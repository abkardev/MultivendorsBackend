import mongoose from 'mongoose';

const cacheMetricsSchema = new mongoose.Schema({
  group: { type: String, required: true, index: true },
  hits: { type: Number, default: 0 },
  misses: { type: Number, default: 0 },
  sets: { type: Number, default: 0 },
  evictions: { type: Number, default: 0 },
  invalidations: { type: Number, default: 0 },
  hitRate: { type: Number, default: 0 },
  avgLatencyMs: { type: Number, default: 0 },
  memoryUsageBytes: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
}, { timestamps: true });

cacheMetricsSchema.index({ group: 1, periodStart: -1 });

export const CacheMetrics = mongoose.model('CacheMetrics', cacheMetricsSchema);
