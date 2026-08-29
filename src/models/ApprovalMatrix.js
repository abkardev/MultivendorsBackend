import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  entityType: {
    type: String,
    enum: [
      'product', 'company', 'refund', 'dispute', 'settlement',
      'rfq', 'quote', 'announcement', 'withdrawal'
    ],
    required: true
  },
  conditions: [{
    field: String,
    operator: {
      type: String,
      enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains']
    },
    value: mongoose.Schema.Types.Mixed
  }],
  approvers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    order: {
      type: Number,
      default: 1
    },
    type: {
      type: String,
      enum: ['any', 'all'],
      default: 'any'
    }
  }],
  minApprovals: {
    type: Number,
    default: 1
  },
  escalationAfter: {
    type: Number,
    default: 0
  },
  autoApproveIf: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ entityType: 1, isActive: 1 });
schema.index({ 'approvers.user': 1 });

export const ApprovalMatrix = mongoose.model('ApprovalMatrix', schema);
