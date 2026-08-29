import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportSession' },
  token: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['temporary', 'reusable', 'one_time'],
    default: 'temporary',
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'revoked'],
    default: 'active',
  },
  expiresAt: { type: Date },
  usedAt: { type: Date },
  usedBy: { type: String },
  ipAddress: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ token: 1 });
schema.index({ session: 1 });
schema.index({ status: 1 });

export const SupportAccessToken = mongoose.model('SupportAccessToken', schema);
