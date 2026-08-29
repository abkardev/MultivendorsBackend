import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  license: { type: mongoose.Schema.Types.ObjectId, ref: 'EnterpriseLicense', required: true },
  activationCode: { type: String, required: true, unique: true },
  method: { type: String, enum: ['online', 'offline'], required: true },
  status: { type: String, enum: ['active', 'deactivated', 'expired'], default: 'active' },
  deviceId: { type: String },
  deviceName: { type: String },
  deviceInfo: {
    platform: { type: String },
    arch: { type: String },
    os: { type: String },
    hostname: { type: String },
    ip: { type: String },
  },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activatedAt: { type: Date, default: Date.now },
  deactivatedAt: { type: Date },
  lastHeartbeat: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ license: 1 });
schema.index({ activationCode: 1 });
schema.index({ status: 1 });
schema.index({ deviceId: 1 });
schema.index({ license: 1, status: 1 });

export const LicenseActivation = mongoose.model('LicenseActivation', schema);
