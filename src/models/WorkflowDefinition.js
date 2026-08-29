import mongoose from 'mongoose';

const triggerSchema = new mongoose.Schema({
  type: { type: String, required: true },
  config: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const variableDefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: String,
  default: mongoose.Schema.Types.Mixed
}, { _id: false });

const workflowDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  tags: [String],
  nodes: [{ type: mongoose.Schema.Types.Mixed }],
  edges: [{ type: mongoose.Schema.Types.Mixed }],
  triggers: [triggerSchema],
  variables: [variableDefSchema],
  settings: {
    maxRetries: { type: Number, default: 3 },
    timeout: { type: Number, default: 300000 },
    parallelExecution: { type: Boolean, default: false },
    errorHandling: { type: String, default: 'stop' }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

workflowDefinitionSchema.index({ status: 1 });
workflowDefinitionSchema.index({ createdBy: 1 });
workflowDefinitionSchema.index({ category: 1, status: 1 });

export const WorkflowDefinition = mongoose.model('WorkflowDefinition', workflowDefinitionSchema);
