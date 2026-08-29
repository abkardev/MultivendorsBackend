import mongoose from 'mongoose';

const metricValueSchema = new mongoose.Schema({
  timestamp: { type: Date },
  value: { type: Number },
  p50: { type: Number },
  p90: { type: Number },
  p95: { type: Number },
  p99: { type: Number },
  count: { type: Number },
}, { _id: false });

const metricSeriesSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  granularity: {
    type: String,
    enum: ['minute', 'hour', 'day', 'week', 'month'],
    required: true
  },
  values: [metricValueSchema],
  tags: [{ type: String }],
  retention: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true, toJSON: { virtuals: true } });

metricSeriesSchema.index({ name: 1, granularity: 1 });
metricSeriesSchema.index({ retention: 1 }, { expireAfterSeconds: 0 });

export const MetricSeries = mongoose.model('MetricSeries', metricSeriesSchema);
