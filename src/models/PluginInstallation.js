import mongoose from 'mongoose';

const pluginInstallationSchema = new mongoose.Schema({
  plugin: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginDefinition', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  installedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  installedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['installed', 'enabled', 'disabled', 'uninstalled'], default: 'enabled' },
  settings: { type: mongoose.Schema.Types.Mixed },
  permissions: [{ type: String }],
  version: { type: String, required: true },
  lastUpdatedAt: { type: Date },
  updateAvailable: { type: String },
  errorLog: [{
    timestamp: { type: Date, default: Date.now },
    message: { type: String },
    code: { type: String },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

pluginInstallationSchema.index({ plugin: 1, organization: 1 }, { unique: true });
pluginInstallationSchema.index({ organization: 1, status: 1 });
pluginInstallationSchema.index({ status: 1 });

const PluginInstallation = mongoose.model('PluginInstallation', pluginInstallationSchema);
export default PluginInstallation;
