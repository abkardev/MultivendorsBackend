import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  fingerprint: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  firstSeen: Date,
  lastSeen: Date,
  userAgent: String,
  platform: String,
  screenResolution: String,
  language: String,
  timezone: String,
  trusted: {
    type: Boolean,
    default: false
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ fingerprint: 1 });
schema.index({ vendor: 1 });
schema.index({ buyer: 1 });
schema.index({ riskScore: -1 });

export const DeviceFingerprint = mongoose.model('DeviceFingerprint', schema);
