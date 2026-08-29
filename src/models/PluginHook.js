import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  pluginId: { type: String, required: true },
  hookName: { type: String, required: true },
  hookType: { type: String, enum: ['filter', 'action', 'api', 'ui', 'menu', 'workflow', 'ai', 'validation'], required: true },
  handler: { type: String, required: true },
  priority: { type: Number, default: 10 },
  description: { type: String },
  version: { type: String },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ pluginId: 1 });
schema.index({ hookName: 1 });
schema.index({ hookType: 1 });
schema.index({ pluginId: 1, hookName: 1 }, { unique: true });

export const PluginHook = mongoose.model('PluginHook', schema);
