import mongoose from 'mongoose';

const salesGoalSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['revenue', 'orders', 'rfqs', 'conversion', 'customers', 'response_time'], required: true },
  target: { type: Number, required: true },
  current: { type: Number, default: 0 },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['active', 'achieved', 'missed', 'paused'], default: 'active' },
  achievedAt: Date,
  notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

salesGoalSchema.index({ vendor: 1, period: 1, type: 1 });
salesGoalSchema.index({ vendor: 1, status: 1 });

export const SalesGoal = mongoose.model('SalesGoal', salesGoalSchema);
