import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  supportUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetTenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  sessionType: {
    type: String,
    enum: ['remote', 'diagnostic', 'audit', 'training'],
    default: 'diagnostic',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'revoked'],
    default: 'active',
  },
  accessToken: { type: String, unique: true },
  expiresAt: { type: Date },
  permissions: [{
    resource: { type: String },
    action: { type: String },
    granted: { type: Boolean },
  }],
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ accessToken: 1 });
schema.index({ supportUser: 1 });
schema.index({ targetTenant: 1 });
schema.index({ status: 1 });

export const SupportSession = mongoose.model('SupportSession', schema);
