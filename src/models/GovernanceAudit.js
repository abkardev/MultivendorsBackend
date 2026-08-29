import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  policy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernancePolicy',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'archived', 'approved', 'rejected', 'commented'],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ policy: 1, createdAt: -1 });
schema.index({ user: 1 });
schema.index({ action: 1 });

export const GovernanceAudit = mongoose.model('GovernanceAudit', schema);
