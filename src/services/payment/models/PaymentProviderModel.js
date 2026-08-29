import mongoose from 'mongoose';

const gatewayConfigSchema = new mongoose.Schema({
  provider: { type: String, required: true, unique: true },
  displayName: String,
  isActive: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  mode: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  priority: { type: Number, default: 0 },
  credentials: { type: mongoose.Schema.Types.Mixed },
  webhookSecret: String,
  webhookUrl: String,
  supportedCurrencies: [String],
  supportedCountries: [String],
  supportedMethods: [String],
  feePercentage: { type: Number, default: 0 },
  fixedFee: { type: Number, default: 0 },
  maxAmount: Number,
  minAmount: Number,
  healthStatus: { type: String, enum: ['healthy', 'degraded', 'down'], default: 'healthy' },
  lastHealthCheck: Date,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export const PaymentProviderConfig = mongoose.model('PaymentProviderConfig', gatewayConfigSchema);
