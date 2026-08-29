import mongoose from 'mongoose';

const diagnosticReportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['system', 'database', 'storage', 'cache', 'search', 'email', 'payment',
      'scheduler', 'queue', 'notification', 'ai', 'ssl', 'dns', 'network', 'dependency'],
    required: true,
  },
  status: { type: String, enum: ['healthy', 'degraded', 'unhealthy', 'unknown'], default: 'unknown' },
  score: { type: Number, min: 0, max: 100 },
  checks: [{
    name: { type: String, required: true },
    status: { type: String, enum: ['passed', 'failed', 'warning', 'skipped'], required: true },
    message: String,
    detail: String,
    durationMs: Number,
    value: mongoose.Schema.Types.Mixed,
    threshold: mongoose.Schema.Types.Mixed,
    recommendation: String,
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  }],
  summary: {
    total: Number,
    passed: Number,
    failed: Number,
    warnings: Number,
    critical: Number,
  },
  recommendations: [{
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    category: String,
    message: { en: String, ar: String },
    action: String,
    autoFixAvailable: { type: Boolean, default: false },
    autoFixCommand: String,
  }],
  triggeredBy: { type: String, enum: ['manual', 'scheduled', 'webhook', 'system'], default: 'manual' },
  triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  durationMs: Number,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

diagnosticReportSchema.index({ type: 1, createdAt: -1 });
diagnosticReportSchema.index({ status: 1 });
diagnosticReportSchema.index({ score: 1 });

export const DiagnosticReport = mongoose.model('DiagnosticReport', diagnosticReportSchema);
