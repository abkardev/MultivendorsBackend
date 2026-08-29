import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  edition: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductEdition', required: true },
  type: { type: String, enum: ['base', 'addon', 'bundle'], default: 'base' },
  price: {
    monthly: { type: Number },
    yearly: { type: Number },
    lifetime: { type: Number },
    currency: { type: String },
  },
  features: [{
    feature: { type: String },
    enabled: { type: Boolean },
    limits: { type: mongoose.Schema.Types.Mixed },
  }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ edition: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const EditionPackage = mongoose.model('EditionPackage', schema);
