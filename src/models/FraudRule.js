import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['velocity', 'ip_reputation', 'device', 'behavioral', 'pattern', 'blacklist', 'whitelist'],
    required: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  action: {
    type: String,
    enum: ['flag', 'block', 'review', 'notify'],
    default: 'flag'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  },
  cooldown: {
    type: Number,
    default: 0
  },
  occurrences: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

schema.index({ type: 1, isActive: 1 });
schema.index({ priority: -1 });
schema.index({ isActive: 1, priority: -1 });

export const FraudRule = mongoose.model('FraudRule', schema);
