import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['USD', 'SAR', 'EUR'], default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending',
    },
    bankDetails: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      iban: { type: String },
      swiftCode: { type: String },
    },
    processedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ user: 1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ user: 1, status: 1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
export default WithdrawalRequest;
