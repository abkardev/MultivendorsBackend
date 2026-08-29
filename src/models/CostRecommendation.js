import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'ResourceCost' },
  type: { type: String, enum: ['rightsizing', 'reserved_capacity', 'cleanup', 'tier_change', 'region_optimization', 'cache_optimization', 'query_optimization'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  currentCost: { type: Number },
  estimatedSavings: { type: Number },
  savingsPercentage: { type: Number },
  implementation: { type: String, enum: ['manual', 'semi_automated', 'automated'], default: 'manual' },
  effort: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  risk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  status: { type: String, enum: ['pending', 'approved', 'implemented', 'rejected', 'dismissed'], default: 'pending' },
  impact: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ resource: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const CostRecommendation = mongoose.model('CostRecommendation', schema);
