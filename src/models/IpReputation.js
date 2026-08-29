import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  category: {
    type: String,
    enum: ['clean', 'suspicious', 'malicious', 'proxy', 'vpn', 'tor', 'datacenter'],
    default: 'clean'
  },
  location: {
    country: String,
    city: String,
    isp: String,
    asn: String
  },
  firstSeen: Date,
  lastSeen: Date,
  flags: [{
    type: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  blocklisted: {
    type: Boolean,
    default: false
  },
  blocklistedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ ip: 1 });
schema.index({ score: -1 });
schema.index({ category: 1 });
schema.index({ blocklisted: 1 });

export const IpReputation = mongoose.model('IpReputation', schema);
