import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
  availableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  escrowBalance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  totalCommissionDeducted: { type: Number, default: 0 },
  currency: { type: String, default: 'SAR' },
  withdrawnBalance: { type: Number, default: 0 },
  lastPayoutDate: Date,
}, { timestamps: true });

export const VendorWallet = mongoose.model('VendorWallet', walletSchema);
