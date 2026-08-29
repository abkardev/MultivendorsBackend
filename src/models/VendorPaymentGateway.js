import mongoose from 'mongoose';

const vendorPaymentGatewaySchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    unique: true,
  },
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'hyperpay', 'paytabs', 'moyasar', 'adyen'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  credentials: {
    apiKey: { type: String },
    secretKey: { type: String },
    webhookSecret: { type: String },
    accountId: { type: String },
    clientId: { type: String },
  },
  bankAccount: {
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    iban: { type: String },
    swiftCode: { type: String },
    currency: { type: String, default: 'SAR' },
  },
  payoutSettings: {
    autoPayout: { type: Boolean, default: false },
    payoutSchedule: { type: String, enum: ['instant', 'daily', 'weekly', 'monthly', 'manual'], default: 'manual' },
    minimumPayout: { type: Number, default: 100 },
  },
}, { timestamps: true });

vendorPaymentGatewaySchema.index({ isActive: 1 });

export const VendorPaymentGateway = mongoose.model('VendorPaymentGateway', vendorPaymentGatewaySchema);
