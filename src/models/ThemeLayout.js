import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  theme: { type: mongoose.Schema.Types.ObjectId, ref: 'Theme', required: true },
  type: { type: String, enum: ['dashboard', 'public', 'auth', 'email', 'print'], default: 'dashboard' },
  sections: [{
    name: { type: String },
    order: { type: Number },
    component: { type: String },
    props: { type: mongoose.Schema.Types.Mixed },
    isVisible: { type: Boolean },
    permissions: [{ type: String }],
  }],
  widgets: [{
    name: { type: String },
    type: { type: String },
    position: { type: mongoose.Schema.Types.Mixed },
    size: { type: mongoose.Schema.Types.Mixed },
    config: { type: mongoose.Schema.Types.Mixed },
    isVisible: { type: Boolean },
  }],
  css: { type: String },
  isDefault: { type: Boolean, default: false },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ theme: 1 });
schema.index({ type: 1 });
schema.index({ isDefault: 1 });
schema.index({ theme: 1, type: 1 });

export const ThemeLayout = mongoose.model('ThemeLayout', schema);
