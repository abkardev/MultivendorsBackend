import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: String,
  bankAccount: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    iban: String,
    swiftCode: String,
  },
  gatewayReference: String,
  fee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  notes: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  completedAt: Date,
  failureReason: String,
}, { timestamps: true });

export const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
