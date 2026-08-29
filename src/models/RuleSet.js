import mongoose from 'mongoose';

const ruleRefSchema = new mongoose.Schema({
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'RuleDefinition', required: true },
  order: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const ruleSetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  rules: [ruleRefSchema],
  evaluationStrategy: {
    type: String,
    enum: ['first_match', 'all_matches', 'cumulative'],
    default: 'first_match'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive'],
    default: 'draft'
  },
  context: { type: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ruleSetSchema.index({ status: 1 });
ruleSetSchema.index({ context: 1, status: 1 });

export const RuleSet = mongoose.model('RuleSet', ruleSetSchema);
