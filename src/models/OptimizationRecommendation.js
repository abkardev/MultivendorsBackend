import mongoose from 'mongoose';

const optimizationRecommendationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['performance', 'cost', 'capacity', 'quality', 'workflow', 'adoption', 'duplicate'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true,
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['identified', 'analyzing', 'recommended', 'approved', 'implemented', 'rejected', 'cancelled'],
    default: 'identified',
  },
  impact: { type: String },
  effort: { type: String, enum: ['low', 'medium', 'high', 'xlarge'] },
  roi: { type: String },
  estimatedSavings: {
    amount: Number,
    currency: { type: String, default: 'USD' },
    period: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
    description: String,
  },
  category: { type: String },
  source: { type: String },
  evidence: [{
    metric: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date },
  }],
  suggestedAction: { type: mongoose.Schema.Types.Mixed },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  implementedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true, toJSON: { virtuals: true } });

optimizationRecommendationSchema.index({ type: 1, status: 1 });
optimizationRecommendationSchema.index({ priority: 1, status: 1 });
optimizationRecommendationSchema.index({ createdAt: -1 });
optimizationRecommendationSchema.index({ source: 1 });

export const OptimizationRecommendation = mongoose.model('OptimizationRecommendation', optimizationRecommendationSchema);
