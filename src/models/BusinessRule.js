import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'not_contains', 'starts_with', 'ends_with', 'between'],
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  logic: { type: String, enum: ['and', 'or'] }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  params: mongoose.Schema.Types.Mixed
}, { _id: false });

const businessRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  code: { type: String, unique: true, required: true },
  type: {
    type: String,
    enum: [
      'pricing', 'discount', 'commission', 'approval', 'compliance',
      'risk', 'fraud', 'notification', 'subscription', 'marketplace',
      'escrow', 'rfq', 'order', 'payment', 'reputation', 'ai', 'automation'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  priority: { type: Number, default: 0 },
  conditions: [conditionSchema],
  actions: [actionSchema],
  triggers: [String],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BusinessRule' }],
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  effectiveFrom: Date,
  effectiveTo: Date,
  simulationResult: {
    passed: Boolean,
    affectedEntities: Number,
    impact: mongoose.Schema.Types.Mixed
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

businessRuleSchema.index({ code: 1 }, { unique: true });
businessRuleSchema.index({ type: 1, status: 1 });
businessRuleSchema.index({ priority: -1 });

export const BusinessRule = mongoose.model('BusinessRule', businessRuleSchema);
