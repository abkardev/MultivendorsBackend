import mongoose from 'mongoose';

const optimizationAutomationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  type: {
    type: String,
    enum: [
      'performance_tuning', 'cache_cleanup', 'index_suggestion',
      'cost_optimization', 'data_cleanup', 'alert_cleanup', 'scheduler_optimization',
    ],
    required: true,
  },
  trigger: {
    type: String,
    enum: ['scheduled', 'metric_threshold', 'manual'],
    required: true,
  },
  config: { type: mongoose.Schema.Types.Mixed },
  schedule: { type: String },
  conditions: [{
    metric: { type: String },
    operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'] },
    value: { type: mongoose.Schema.Types.Mixed },
  }],
  actions: [{
    type: { type: String },
    params: { type: mongoose.Schema.Types.Mixed },
    order: { type: Number },
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled'],
    default: 'active',
  },
  lastRun: { type: Date },
  lastResult: { type: String },
  approvalRequired: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

optimizationAutomationSchema.index({ type: 1, status: 1 });
optimizationAutomationSchema.index({ trigger: 1, status: 1 });
optimizationAutomationSchema.index({ status: 1 });
optimizationAutomationSchema.index({ createdBy: 1 });

export const OptimizationAutomation = mongoose.model('OptimizationAutomation', optimizationAutomationSchema);
