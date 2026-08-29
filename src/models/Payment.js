import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['USD', 'SAR', 'EUR'], default: 'USD' },
    method: { type: String, enum: ['credit_card', 'bank_transfer', 'paypal'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    gatewayRef: { type: String }, // Stripe payment intent ID, HyperPay checkout ID, etc.
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1 });
paymentSchema.index({ buyer: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ buyer: 1, status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
