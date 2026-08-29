import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  pluginId: { type: String, required: true },
  eventName: { type: String, required: true },
  eventType: { type: String, enum: ['triggered', 'listened', 'emitted'], required: true },
  description: { type: String },
  schema: { type: mongoose.Schema.Types.Mixed },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ pluginId: 1 });
schema.index({ eventName: 1 });
schema.index({ eventType: 1 });
schema.index({ pluginId: 1, eventName: 1 }, { unique: true });

export const PluginEvent = mongoose.model('PluginEvent', schema);
