import mongoose from 'mongoose';

const actionExecutedSchema = new mongoose.Schema({
  type: String,
  params: mongoose.Schema.Types.Mixed,
  order: Number,
  result: mongoose.Schema.Types.Mixed
}, { _id: false });

const ruleExecutionLogSchema = new mongoose.Schema({
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'RuleDefinition' },
  ruleSet: { type: mongoose.Schema.Types.ObjectId, ref: 'RuleSet' },
  triggerEntity: String,
  triggerId: String,
  context: { type: mongoose.Schema.Types.Mixed },
  conditionsMatched: { type: Boolean, default: false },
  actionsExecuted: [actionExecutedSchema],
  result: { type: mongoose.Schema.Types.Mixed },
  executionTime: Number,
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  error: String,
  executedAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ruleExecutionLogSchema.index({ rule: 1, executedAt: -1 });
ruleExecutionLogSchema.index({ ruleSet: 1, executedAt: -1 });
ruleExecutionLogSchema.index({ triggerEntity: 1, triggerId: 1 });
ruleExecutionLogSchema.index({ status: 1 });

export const RuleExecutionLog = mongoose.model('RuleExecutionLog', ruleExecutionLogSchema);
