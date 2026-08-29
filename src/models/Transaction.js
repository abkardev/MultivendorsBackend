import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['payment', 'escrow_hold', 'escrow_release', 'refund', 'withdrawal', 'withdrawal_fee'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'SAR', 'EUR'], default: 'USD' },
    balance: { type: Number, required: true }, // balance after this transaction
    reference: { type: String }, // order or payment ID
    description: { type: String, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, type: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
