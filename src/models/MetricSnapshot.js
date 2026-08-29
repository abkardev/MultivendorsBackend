import mongoose from 'mongoose';

const metricSnapshotSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['gauge', 'counter', 'histogram', 'timer'],
    required: true
  },
  value: { type: Number, required: true },
  tags: [{ type: String }],
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  p50: { type: Number },
  p90: { type: Number },
  p95: { type: Number },
  p99: { type: Number },
  avg: { type: Number },
  min: { type: Number },
  max: { type: Number },
  count: { type: Number },
  sum: { type: Number },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

metricSnapshotSchema.index({ name: 1, timestamp: -1 });
metricSnapshotSchema.index({ type: 1, timestamp: -1 });

export const MetricSnapshot = mongoose.model('MetricSnapshot', metricSnapshotSchema);
