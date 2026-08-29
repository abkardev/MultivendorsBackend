import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  type: { type: String, enum: ['light', 'dark', 'custom'], default: 'custom' },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  layout: {
    header: { type: mongoose.Schema.Types.Mixed },
    sidebar: { type: mongoose.Schema.Types.Mixed },
    footer: { type: mongoose.Schema.Types.Mixed },
    content: { type: mongoose.Schema.Types.Mixed },
  },
  components: {
    cards: { type: mongoose.Schema.Types.Mixed },
    buttons: { type: mongoose.Schema.Types.Mixed },
    forms: { type: mongoose.Schema.Types.Mixed },
    tables: { type: mongoose.Schema.Types.Mixed },
    modals: { type: mongoose.Schema.Types.Mixed },
    navigation: { type: mongoose.Schema.Types.Mixed },
  },
  variables: { type: Map, of: String },
  responsive: {
    mobile: { type: mongoose.Schema.Types.Mixed },
    tablet: { type: mongoose.Schema.Types.Mixed },
    desktop: { type: mongoose.Schema.Types.Mixed },
  },
  rtl: {
    enabled: { type: Boolean },
    layout: { type: mongoose.Schema.Types.Mixed },
    components: { type: mongoose.Schema.Types.Mixed },
  },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ type: 1 });
schema.index({ isDefault: 1 });
schema.index({ isActive: 1 });

export const Theme = mongoose.model('Theme', schema);
