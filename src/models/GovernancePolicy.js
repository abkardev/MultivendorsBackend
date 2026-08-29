import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['marketplace', 'approval', 'privacy', 'security', 'data', 'document', 'sla', 'compliance', 'risk'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  effectiveFrom: Date,
  effectiveTo: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  category: String,
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ code: 1 });
schema.index({ type: 1, status: 1 });
schema.index({ status: 1, effectiveFrom: 1, effectiveTo: 1 });
schema.index({ version: -1 });

export const GovernancePolicy = mongoose.model('GovernancePolicy', schema);
