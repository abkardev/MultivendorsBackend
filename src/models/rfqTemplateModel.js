import mongoose from 'mongoose';

const rfqTemplateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  title: { en: String, ar: String },
  description: { en: String, ar: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  quantity: Number,
  unit: String,
  budget: { min: Number, max: Number },
  destinationPort: String,
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

rfqTemplateSchema.index({ user: 1 });
rfqTemplateSchema.index({ category: 1 });
rfqTemplateSchema.index({ user: 1, isDefault: 1 });

export const RfqTemplate = mongoose.model('RfqTemplate', rfqTemplateSchema);
