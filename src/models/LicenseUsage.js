import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'EnterpriseLicense', required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  activeSeats: { type: Number, default: 0 },
  totalSeats: { type: Number, default: 0 },
  apiCalls: { type: Number, default: 0 },
  storageUsed: { type: Number, default: 0 },
  aiTokens: { type: Number, default: 0 },
  activeDevices: { type: Number, default: 0 },
  metrics: { type: Map, of: Number },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ license: 1, period: 1, periodStart: 1 }, { unique: true });
schema.index({ license: 1 });
schema.index({ period: 1 });
schema.index({ periodStart: 1 });

export const LicenseUsage = mongoose.model('LicenseUsage', schema);
