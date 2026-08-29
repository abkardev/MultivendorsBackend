import mongoose from 'mongoose';

const optimizationActionSchema = new mongoose.Schema({
  recommendation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OptimizationRecommendation',
    required: true,
  },
  action: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'],
    default: 'pending',
  },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  result: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  rollbackPlan: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, toJSON: { virtuals: true } });

optimizationActionSchema.index({ recommendation: 1 });
optimizationActionSchema.index({ status: 1 });
optimizationActionSchema.index({ startedBy: 1 });

export const OptimizationAction = mongoose.model('OptimizationAction', optimizationActionSchema);
