import mongoose from 'mongoose';

const traceEventSchema = new mongoose.Schema({
  trace: { type: mongoose.Schema.Types.ObjectId, ref: 'Trace', required: true },
  span: { type: mongoose.Schema.Types.ObjectId, ref: 'Span', required: true, index: true },
  type: {
    type: String,
    enum: [
      'db_query', 'cache_access', 'http_request', 'queue_publish',
      'ai_request', 'notification_send', 'workflow_step'
    ],
    required: true
  },
  duration: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

traceEventSchema.index({ trace: 1, timestamp: -1 });
traceEventSchema.index({ type: 1, timestamp: -1 });

export const TraceEvent = mongoose.model('TraceEvent', traceEventSchema);
