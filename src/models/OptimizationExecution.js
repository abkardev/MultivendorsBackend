import mongoose from 'mongoose';

const optimizationExecutionSchema = new mongoose.Schema({
  automation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OptimizationAutomation',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'running', 'completed', 'failed', 'rolled_back'],
    default: 'pending_approval',
  },
  findings: [{
    type: { type: String },
    detail: { type: String },
    impact: { type: String },
  }],
  actionsExecuted: [{
    action: { type: String },
    result: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['success', 'failure', 'skipped'] },
  }],
  startedAt: { type: Date },
  completedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  duration: { type: Number },
  error: { type: String },
  rollbackStatus: { type: String, enum: ['not_required', 'pending', 'completed', 'failed'] },
}, { timestamps: true, toJSON: { virtuals: true } });

optimizationExecutionSchema.index({ automation: 1, status: 1 });
optimizationExecutionSchema.index({ status: 1 });
optimizationExecutionSchema.index({ startedAt: -1 });
optimizationExecutionSchema.index({ approvedBy: 1 });

export const OptimizationExecution = mongoose.model('OptimizationExecution', optimizationExecutionSchema);
