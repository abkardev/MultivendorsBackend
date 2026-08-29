import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtensionCategory' },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ parent: 1 });
schema.index({ isActive: 1 });
schema.index({ sortOrder: 1 });

export const ExtensionCategory = mongoose.model('ExtensionCategory', schema);
