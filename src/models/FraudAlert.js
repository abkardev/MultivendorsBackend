import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'duplicate_account', 'duplicate_company', 'suspicious_rfq',
      'suspicious_order', 'suspicious_review', 'fake_company',
      'fake_buyer', 'bot_activity', 'mass_messaging', 'spam',
      'account_takeover', 'credential_abuse', 'suspicious_login',
      'impossible_travel', 'api_abuse', 'velocity', 'behavioral', 'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    default: 'open'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    required: true
  },
  evidence: {
    ip: String,
    userAgent: String,
    deviceId: String,
    location: String,
    timestamp: Date,
    relatedIds: [String]
  },
  detectedBy: {
    type: String,
    enum: ['system', 'ai', 'manual'],
    default: 'system'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String,
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ vendor: 1, status: 1 });
schema.index({ buyer: 1, status: 1 });
schema.index({ type: 1, severity: 1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ score: -1 });

export const FraudAlert = mongoose.model('FraudAlert', schema);
