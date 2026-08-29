import mongoose from 'mongoose';

const productionReadinessSchema = new mongoose.Schema({
  environment: { type: String, enum: ['development', 'staging', 'production'], required: true },
  checks: [{
    category: {
      type: String,
      enum: ['environment', 'secrets', 'storage', 'payments', 'ai', 'scheduler',
        'queue', 'cdn', 'cache', 'search', 'notifications', 'ssl',
        'security_headers', 'backups', 'monitoring', 'logging', 'health',
        'disaster_recovery'],
      required: true,
    },
    name: { type: String, required: true },
    status: { type: String, enum: ['passed', 'failed', 'warning', 'skipped'], required: true },
    message: String,
    detail: String,
    recommendation: String,
    severity: { type: String, enum: ['blocking', 'warning', 'info'], default: 'info' },
  }],
  score: { type: Number, min: 0, max: 100 },
  blockingIssues: [{ type: String }],
  warnings: [{ type: String }],
  recommendations: [{
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
    category: String,
    message: String,
    action: String,
  }],
  assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assessedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

productionReadinessSchema.index({ environment: 1, createdAt: -1 });

export const ProductionReadiness = mongoose.model('ProductionReadiness', productionReadinessSchema);
