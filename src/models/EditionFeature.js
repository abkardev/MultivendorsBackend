import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  edition: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductEdition', required: true },
  featureCode: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['core', 'ai', 'automation', 'integration', 'analytics', 'security', 'support', 'white_label', 'api', 'compliance'],
  },
  type: { type: String, enum: ['boolean', 'numeric', 'text', 'json'], default: 'boolean' },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  limits: {
    min: { type: Number },
    max: { type: Number },
    unit: { type: String },
  },
  dependsOn: [{ type: String }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ edition: 1 });
schema.index({ featureCode: 1 });
schema.index({ category: 1 });
schema.index({ edition: 1, featureCode: 1 }, { unique: true });

export const EditionFeature = mongoose.model('EditionFeature', schema);
