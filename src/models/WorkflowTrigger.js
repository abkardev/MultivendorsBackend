import mongoose from 'mongoose';

const workflowTriggerSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
  type: {
    type: String,
    enum: ['schedule', 'webhook', 'event', 'manual', 'conditional'],
    required: true
  },
  config: { type: mongoose.Schema.Types.Mixed },
  cronExpression: String,
  eventType: String,
  webhookSecret: String,
  isActive: { type: Boolean, default: true },
  lastFiredAt: Date
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

workflowTriggerSchema.index({ workflow: 1 });
workflowTriggerSchema.index({ type: 1, isActive: 1 });
workflowTriggerSchema.index({ eventType: 1, isActive: 1 });

export const WorkflowTrigger = mongoose.model('WorkflowTrigger', workflowTriggerSchema);
