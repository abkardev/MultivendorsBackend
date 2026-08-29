import mongoose from 'mongoose';

const escrowAccountSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  status: {
    type: String,
    enum: ['held', 'partially_released', 'released', 'refunded', 'disputed'],
    default: 'held',
  },
  releasedAmount: { type: Number, default: 0 },
  refundedAmount: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  releaseDate: Date,
  disputeDate: Date,
  disputeReason: String,
  autoReleaseDays: { type: Number, default: 14 },
  timeline: [{
    action: String,
    amount: Number,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export const EscrowAccountPb = mongoose.model('EscrowAccountPb', escrowAccountSchema);
