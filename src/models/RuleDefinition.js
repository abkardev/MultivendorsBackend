import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  logic: { type: String, enum: ['and', 'or'] }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  params: mongoose.Schema.Types.Mixed,
  order: { type: Number, default: 0 }
}, { _id: false });

const variableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  expression: String
}, { _id: false });

const ruleDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['approval', 'pricing', 'marketplace', 'commission', 'validation', 'fraud', 'notification', 'risk'],
    required: true
  },
  priority: { type: Number, default: 0 },
  conditions: [conditionSchema],
  actions: [actionSchema],
  variables: [variableSchema],
  metadata: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  effectiveDate: Date,
  expiryDate: Date
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ruleDefinitionSchema.index({ category: 1, status: 1 });
ruleDefinitionSchema.index({ priority: -1 });
ruleDefinitionSchema.index({ createdBy: 1 });

export const RuleDefinition = mongoose.model('RuleDefinition', ruleDefinitionSchema);
