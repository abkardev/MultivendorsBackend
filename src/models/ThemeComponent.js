import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  theme: { type: mongoose.Schema.Types.ObjectId, ref: 'Theme', required: true },
  componentType: {
    type: String,
    enum: ['header', 'footer', 'sidebar', 'card', 'button', 'form', 'table', 'modal', 'navigation', 'banner', 'widget', 'custom'],
    required: true,
  },
  props: { type: mongoose.Schema.Types.Mixed },
  styles: { type: mongoose.Schema.Types.Mixed },
  variants: [{
    name: { type: String },
    props: { type: mongoose.Schema.Types.Mixed },
    styles: { type: mongoose.Schema.Types.Mixed },
  }],
  isDefault: { type: Boolean, default: false },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ theme: 1 });
schema.index({ componentType: 1 });
schema.index({ isDefault: 1 });
schema.index({ theme: 1, componentType: 1 });

export const ThemeComponent = mongoose.model('ThemeComponent', schema);
