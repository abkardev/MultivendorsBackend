import mongoose from 'mongoose';

const cannedResponseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleAr: String,
  body: { type: String, required: true },
  bodyAr: String,
  category: { type: String, enum: ['welcome', 'verification', 'payment', 'shipping', 'subscription', 'technical', 'general', 'custom'], default: 'general' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usageCount: { type: Number, default: 0 },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

cannedResponseSchema.index({ category: 1, isActive: 1 });
cannedResponseSchema.index({ createdBy: 1 });

export const CannedResponse = mongoose.model('CannedResponse', cannedResponseSchema);
