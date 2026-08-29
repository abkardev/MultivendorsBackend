import mongoose from 'mongoose';

const eventLogSchema = new mongoose.Schema({
  event: { type: String, required: true },
  entityType: String,
  entityId: String,
  trigger: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'triggerModel'
  },
  triggerModel: {
    type: String,
    enum: ['EventRule', 'WorkflowDefinition']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  payload: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
  error: String,
  processedAt: Date,
  processingTime: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

eventLogSchema.index({ event: 1, status: 1 });
eventLogSchema.index({ entityType: 1, entityId: 1 });
eventLogSchema.index({ createdAt: -1 });

export const EventLog = mongoose.model('EventLog', eventLogSchema);
