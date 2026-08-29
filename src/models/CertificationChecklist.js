import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['production', 'security', 'performance', 'deployment', 'compliance', 'marketplace'],
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  description: { type: String },
  items: [{
    name: { type: String },
    description: { type: String },
    category: { type: String },
    weight: { type: Number },
    required: { type: Boolean },
    automated: { type: Boolean },
    evidenceRequired: { type: Boolean },
    remediation: { type: String },
    referenceUrl: { type: String },
  }],
  minScore: { type: Number, default: 80 },
  version: { type: String },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const CertificationChecklist = mongoose.model('CertificationChecklist', schema);
