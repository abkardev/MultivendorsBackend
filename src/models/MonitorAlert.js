import mongoose from 'mongoose';

const monitorAlertSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  metric: { type: String, required: true },
  condition: {
    type: { type: String, enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'], required: true },
    value: { type: Number, required: true },
    duration: { type: Number, description: 'Duration in minutes the condition must be met' },
  },
  severity: { type: String, enum: ['info', 'warning', 'critical', 'emergency'], default: 'warning' },
  status: { type: String, enum: ['active', 'triggered', 'resolved', 'disabled'], default: 'active' },
  lastTriggeredAt: Date,
  lastResolvedAt: Date,
  triggeredCount: { type: Number, default: 0 },
  channels: [{ type: String, enum: ['email', 'slack', 'sms', 'webhook', 'in_app'] }],
  cooldownMinutes: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

monitorAlertSchema.index({ metric: 1, status: 1 });
monitorAlertSchema.index({ severity: 1, status: 1 });

export const MonitorAlert = mongoose.model('MonitorAlert', monitorAlertSchema);
