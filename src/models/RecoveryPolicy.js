import mongoose from 'mongoose';

const recoveryPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['database', 'storage', 'configuration', 'scheduler', 'full'], required: true },
  description: String,
  rto: { type: Number, required: true, description: 'Recovery Time Objective in minutes' },
  rpo: { type: Number, required: true, description: 'Recovery Point Objective in minutes' },
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  steps: [{
    order: Number,
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['restore', 'verify', 'notify', 'manual'], default: 'restore' },
    config: { type: mongoose.Schema.Types.Mixed },
    timeoutMinutes: { type: Number, default: 30 },
    requiredApproval: { type: Boolean, default: false },
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notificationChannels: [{ type: String, enum: ['email', 'slack', 'sms'] }],
  }],
  notification: {
    onStart: { type: Boolean, default: true },
    onComplete: { type: Boolean, default: true },
    onFailure: { type: Boolean, default: true },
    channels: [{ type: String, enum: ['email', 'slack', 'sms'] }],
  },
  lastTestedAt: Date,
  lastTestStatus: { type: String, enum: ['success', 'failed', 'never'], default: 'never' },
  testFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], default: 'monthly' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

recoveryPolicySchema.index({ type: 1, priority: -1 });

export const RecoveryPolicy = mongoose.model('RecoveryPolicy', recoveryPolicySchema);
