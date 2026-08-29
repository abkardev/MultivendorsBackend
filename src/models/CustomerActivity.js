import mongoose from 'mongoose';

const customerActivitySchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['rfq', 'quotation', 'order', 'message', 'review', 'note', 'call', 'email', 'meeting', 'follow_up', 'reminder', 'other'],
    required: true,
  },
  description: { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

customerActivitySchema.index({ vendor: 1, buyer: 1, createdAt: -1 });
customerActivitySchema.index({ vendor: 1, type: 1 });

export const CustomerActivity = mongoose.model('CustomerActivity', customerActivitySchema);
