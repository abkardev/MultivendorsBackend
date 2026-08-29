import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'EnterpriseLicense', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  seatType: { type: String, enum: ['admin', 'user', 'viewer', 'api'], default: 'user' },
  status: { type: String, enum: ['active', 'invited', 'suspended', 'removed'], default: 'active' },
  assignedAt: { type: Date, default: Date.now },
  lastAccess: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ license: 1 });
schema.index({ user: 1 });
schema.index({ email: 1 });
schema.index({ status: 1 });
schema.index({ license: 1, user: 1 });
schema.index({ license: 1, status: 1 });

export const LicenseSeat = mongoose.model('LicenseSeat', schema);
