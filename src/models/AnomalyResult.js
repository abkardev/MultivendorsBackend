import mongoose from 'mongoose';

const anomalyResultSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'revenue', 'order', 'rfq', 'payment', 'escrow', 'fraud',
      'traffic', 'conversion', 'api', 'search', 'ai_usage', 'operational'
    ],
    required: true
  },
  entityType: String,
  entityId: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'ignored'],
    default: 'open'
  },
  metric: String,
  expectedValue: Number,
  actualValue: Number,
  deviation: Number,
  deviationPercent: Number,
  detectedAt: { type: Date, default: Date.now },
  investigatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  investigatedAt: Date,
  resolvedAt: Date,
  resolution: String,
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

anomalyResultSchema.index({ type: 1, status: 1 });
anomalyResultSchema.index({ severity: 1, detectedAt: -1 });
anomalyResultSchema.index({ entityType: 1, entityId: 1 });

export const AnomalyResult = mongoose.model('AnomalyResult', anomalyResultSchema);
