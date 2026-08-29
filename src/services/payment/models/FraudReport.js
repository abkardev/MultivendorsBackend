import mongoose from 'mongoose';

const fraudReportSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  riskScore: { type: Number, default: 0 },
  level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  status: { type: String, enum: ['review', 'approved', 'blocked', 'investigating'], default: 'review' },
  flags: [String],
  rules: [String],
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,
  reason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const FraudReport = mongoose.model('FraudReport', fraudReportSchema);
