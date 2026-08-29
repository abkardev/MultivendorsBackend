import mongoose from 'mongoose';

const spanLogSchema = new mongoose.Schema({
  timestamp: { type: Date },
  message: { type: String },
  level: { type: String },
  fields: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const spanSchema = new mongoose.Schema({
  trace: { type: mongoose.Schema.Types.ObjectId, ref: 'Trace', required: true, index: true },
  spanId: { type: String, unique: true, required: true },
  parentSpanId: { type: String },
  name: { type: String, required: true },
  service: { type: String, required: true },
  operation: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  tags: [{ type: String }],
  logs: [spanLogSchema],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, toJSON: { virtuals: true } });

spanSchema.index({ trace: 1, spanId: 1 });
spanSchema.index({ service: 1, startTime: -1 });
spanSchema.index({ parentSpanId: 1 });

export const Span = mongoose.model('Span', spanSchema);
