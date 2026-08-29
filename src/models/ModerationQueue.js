import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: [
      'product', 'company', 'supplier', 'buyer', 'rfq',
      'review', 'document', 'message', 'announcement',
      'category', 'image', 'attachment'
    ],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entity: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'escalated'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  notes: String,
  tags: [String],
  flags: [{
    type: {
      type: String
    },
    details: String,
    automated: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ status: 1, priority: -1, createdAt: 1 });
schema.index({ entityType: 1, entityId: 1 });
schema.index({ assignedTo: 1, status: 1 });
schema.index({ reportedBy: 1 });
schema.index({ priority: -1, status: 1 });

export const ModerationQueue = mongoose.model('ModerationQueue', schema);
