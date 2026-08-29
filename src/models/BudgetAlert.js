import mongoose from 'mongoose';

const budgetAlertSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  budget: { type: Number, required: true },
  spent: { type: Number, required: true },
  threshold: { type: Number, required: true },
  status: {
    type: String,
    enum: ['active', 'triggered', 'resolved'],
    default: 'active'
  },
  triggeredAt: { type: Date },
  resolvedAt: { type: Date },
  notified: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true, toJSON: { virtuals: true } });

budgetAlertSchema.index({ status: 1, category: 1 });
budgetAlertSchema.index({ 'notified': 1 });

export const BudgetAlert = mongoose.model('BudgetAlert', budgetAlertSchema);
