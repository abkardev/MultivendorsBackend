import mongoose from 'mongoose';

const approvalStepSchema = new mongoose.Schema({
  stepNumber: Number,
  label: { en: String, ar: String },
  assigneeRole: { type: String, enum: ['admin', 'manager', 'vendor', 'user'] },
  assigneeUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
  comment: String,
  actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actedAt: Date,
});

const approvalWorkflowSchema = new mongoose.Schema({
  name: { en: String, ar: String },
  resourceType: { type: String, required: true, enum: ['procurement', 'verification', 'withdrawal', 'document', 'registration', 'tender_award'] },
  steps: [approvalStepSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const approvalRequestSchema = new mongoose.Schema({
  workflow: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalWorkflow' },
  resourceType: String,
  resourceId: mongoose.Schema.Types.ObjectId,
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { en: String, ar: String },
  description: String,
  currentStep: { type: Number, default: 0 },
  steps: [approvalStepSchema],
  status: { type: String, enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  metadata: mongoose.Schema.Types.Mixed,
  completedAt: Date,
}, { timestamps: true });

approvalRequestSchema.index({ status: 1, createdAt: -1 });
approvalRequestSchema.index({ requester: 1 });
approvalRequestSchema.index({ resourceType: 1, resourceId: 1 });
approvalRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });

approvalWorkflowSchema.index({ resourceType: 1, isActive: 1 });

export const ApprovalWorkflow = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
export const ApprovalRequest = mongoose.model('ApprovalRequest', approvalRequestSchema);
