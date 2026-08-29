import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number },
  currency: { type: String },
  reason: { type: String },
  type: { type: String, enum: ['full', 'partial'] },
  initiator: { type: String, enum: ['buyer', 'admin', 'system'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'processing', 'completed'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  completedAt: { type: Date },
  notes: { type: String },
  reference: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ order: 1 });
schema.index({ status: 1 });
schema.index({ initiator: 1 });
schema.index({ isActive: 1 });

export const Refund = mongoose.models.Refund || mongoose.model('Refund', schema);
