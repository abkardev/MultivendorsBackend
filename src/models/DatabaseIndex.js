import mongoose from 'mongoose';

const databaseIndexSchema = new mongoose.Schema({
  collection: { type: String, required: true },
  name: { type: String, required: true },
  fields: [{
    name: { type: String },
    direction: { type: Number },
    type: { type: String },
  }],
  type: { type: String, enum: ['single', 'compound', 'text', 'geospatial', 'hashed', 'wildcard'], default: 'single' },
  status: { type: String, enum: ['active', 'building', 'unused', 'duplicate', 'recommended'], default: 'active' },
  size: { type: Number },
  usage: {
    reads: { type: Number },
    writes: { type: Number },
    lastUsed: { type: Date },
  },
  cardinality: { type: Number },
  isUnique: { type: Boolean, default: false },
  isSparse: { type: Boolean, default: false },
  isPartial: { type: Boolean, default: false },
  recommendation: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

databaseIndexSchema.index({ collection: 1, name: 1 }, { unique: true });
databaseIndexSchema.index({ collection: 1, status: 1 });
databaseIndexSchema.index({ status: 1 });

export const DatabaseIndex = mongoose.model('DatabaseIndex', databaseIndexSchema);
