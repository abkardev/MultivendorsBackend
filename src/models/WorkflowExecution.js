import mongoose from 'mongoose';

const executionPathSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  status: { type: String, required: true },
  startedAt: Date,
  completedAt: Date,
  result: mongoose.Schema.Types.Mixed,
  error: String
}, { _id: false });

const workflowExecutionSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'running'
  },
  trigger: { type: mongoose.Schema.Types.Mixed },
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  currentNode: String,
  executionPath: [executionPathSchema],
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  duration: Number,
  error: { type: mongoose.Schema.Types.Mixed },
  retryCount: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

workflowExecutionSchema.index({ workflow: 1, status: 1 });
workflowExecutionSchema.index({ startedAt: -1 });
workflowExecutionSchema.index({ status: 1 });

export const WorkflowExecution = mongoose.model('WorkflowExecution', workflowExecutionSchema);
