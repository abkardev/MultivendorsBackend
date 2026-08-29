import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'ResourceCost' },
  type: { type: String, enum: ['rightsize', 'downsize', 'terminate', 'migrate', 'reserve'], required: true },
  status: { type: String, enum: ['identified', 'analyzed', 'recommended', 'approved', 'implemented', 'verified'], default: 'identified' },
  currentConfig: { type: Object },
  recommendedConfig: { type: Object },
  savings: {
    estimated: { type: Number },
    actual: { type: Number },
    currency: { type: String },
  },
  implementation: {
    effort: { type: String },
    risk: { type: String },
    steps: [{ type: String }],
    automated: { type: Boolean },
  },
  validated: { type: Boolean, default: false },
  validatedAt: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ resource: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const ResourceOptimization = mongoose.model('ResourceOptimization', schema);
