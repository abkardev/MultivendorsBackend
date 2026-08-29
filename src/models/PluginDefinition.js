import mongoose from 'mongoose';

const pluginDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  version: { type: String, required: true },
  author: { type: String },
  icon: { type: String },
  category: { type: String },
  tags: [{ type: String }],
  entryPoint: { type: String, required: true },
  permissions: [{ type: String }],
  settingsSchema: { type: mongoose.Schema.Types.Mixed },
  dependencies: [{
    plugin: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginDefinition' },
    version: { type: String },
  }],
  minAppVersion: { type: String },
  maxAppVersion: { type: String },
  documentation: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'deprecated'], default: 'pending' },
  downloads: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  isOfficial: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

pluginDefinitionSchema.index({ slug: 1 });
pluginDefinitionSchema.index({ status: 1, category: 1 });
pluginDefinitionSchema.index({ tags: 1 });
pluginDefinitionSchema.index({ isOfficial: 1, downloads: -1 });

const PluginDefinition = mongoose.model('PluginDefinition', pluginDefinitionSchema);
export default PluginDefinition;
