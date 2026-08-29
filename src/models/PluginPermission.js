import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  pluginId: { type: String, required: true },
  permission: { type: String, required: true },
  description: { type: String },
  scope: { type: String, enum: ['global', 'tenant', 'user'], default: 'tenant' },
  isRequired: { type: Boolean, default: true },
  defaultValue: { type: Boolean, default: false },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ pluginId: 1 });
schema.index({ permission: 1 });
schema.index({ scope: 1 });
schema.index({ pluginId: 1, permission: 1 }, { unique: true });

export const PluginPermission = mongoose.model('PluginPermission', schema);
