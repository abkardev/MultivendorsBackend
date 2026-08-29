import mongoose from 'mongoose';

const traceSchema = new mongoose.Schema({
  traceId: { type: String, unique: true, index: true, required: true },
  name: { type: String, required: true },
  service: { type: String, required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number },
  status: {
    type: String,
    enum: ['success', 'error', 'critical'],
    default: 'success'
  },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  tags: [{ type: String }],
  rootSpan: { type: mongoose.Schema.Types.ObjectId, ref: 'Span' },
}, { timestamps: true, toJSON: { virtuals: true } });

traceSchema.index({ service: 1, startTime: -1 });
traceSchema.index({ status: 1, startTime: -1 });

export const Trace = mongoose.model('Trace', traceSchema);
