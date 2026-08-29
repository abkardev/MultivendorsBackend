import mongoose from 'mongoose';

const performanceBudgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['api_latency', 'page_load', 'database_query', 'memory_usage', 'cpu_usage', 'bundle_size', 'api_throughput'], required: true },
  metric: { type: String, required: true },
  warning: { type: Number, required: true },
  critical: { type: Number, required: true },
  unit: { type: String },
  scope: { type: String, enum: ['global', 'endpoint', 'service', 'page'], default: 'global' },
  scopeValue: { type: String },
  isActive: { type: Boolean, default: true },
  tags: [{ type: String }],
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

performanceBudgetSchema.index({ type: 1, isActive: 1 });
performanceBudgetSchema.index({ scope: 1, scopeValue: 1 });
performanceBudgetSchema.index({ createdBy: 1 });

export const PerformanceBudget = mongoose.model('PerformanceBudget', performanceBudgetSchema);
