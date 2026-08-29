import mongoose from 'mongoose';

const alertGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  alerts: [{
    alertId: { type: String },
    source: { type: String },
    message: { type: String },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
    timestamp: { type: Date },
  }],
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'closed'],
    default: 'open',
  },
  rootCause: { type: String },
  timeline: [{
    event: { type: String },
    timestamp: { type: Date },
    detail: { type: String },
  }],
  suggestedActions: [{ type: String }],
  mergedAt: { type: Date },
  resolvedAt: { type: Date },
  resolver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

alertGroupSchema.index({ status: 1, severity: 1 });
alertGroupSchema.index({ 'alerts.alertId': 1 });
alertGroupSchema.index({ createdAt: -1 });
alertGroupSchema.index({ resolvedAt: 1 });

export const AlertGroup = mongoose.model('AlertGroup', alertGroupSchema);
