import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  extension: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceExtension', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  status: {
    type: String,
    enum: ['installed', 'active', 'inactive', 'upgrading', 'uninstalled', 'failed'],
    default: 'installed',
  },
  version: { type: String, required: true },
  previousVersion: { type: String },
  configuration: { type: Map, of: Object },
  permissions: [{
    permission: { type: String },
    granted: { type: Boolean },
    grantedAt: { type: Date },
  }],
  installedAt: { type: Date, default: Date.now },
  activatedAt: { type: Date },
  lastUpgraded: { type: Date },
  lastUsed: { type: Date },
  usage: {
    calls: { type: Number },
    errors: { type: Number },
    lastError: { type: String },
  },
  metadata: { type: Map, of: String },
  installedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ extension: 1, tenant: 1 }, { unique: true });
schema.index({ extension: 1 });
schema.index({ tenant: 1 });
schema.index({ status: 1 });
schema.index({ tenant: 1, status: 1 });

export const ExtensionInstallation = mongoose.model('ExtensionInstallation', schema);
