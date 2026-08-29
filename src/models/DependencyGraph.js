import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String },
  services: [{
    name: { type: String },
    type: { type: String },
    version: { type: String },
    status: { type: String },
    dependencies: [{
      service: { type: String },
      type: { type: String },
      critical: { type: Boolean },
      latency: { type: Number },
    }],
  }],
  topology: {
    nodes: { type: Array },
    edges: { type: Array },
    levels: { type: Number },
  },
  lastUpdated: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });

export const DependencyGraph = mongoose.model('DependencyGraph', schema);
