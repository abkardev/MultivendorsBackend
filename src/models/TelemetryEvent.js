import mongoose from 'mongoose';

const telemetryEventSchema = new mongoose.Schema({
  type: {
    type: String,
    index: true,
    enum: [
      'api_latency', 'db_latency', 'cache_latency', 'queue_latency',
      'scheduler_latency', 'ai_latency', 'search_latency',
      'memory', 'cpu', 'disk', 'network', 'request_volume'
    ],
    required: true
  },
  source: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  tags: { type: Map, of: String, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

telemetryEventSchema.index({ type: 1, timestamp: -1 });
telemetryEventSchema.index({ source: 1, timestamp: -1 });

export const TelemetryEvent = mongoose.model('TelemetryEvent', telemetryEventSchema);
