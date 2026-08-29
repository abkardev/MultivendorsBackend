import mongoose from 'mongoose';

const resourceGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['compute', 'memory', 'storage', 'network', 'database', 'cache', 'queue'], required: true },
  capacity: {
    total: { type: Number },
    used: { type: Number },
    available: { type: Number },
    unit: { type: String },
  },
  utilization: { type: Number, default: 0 },
  instances: [{
    name: { type: String },
    status: { type: String },
    capacity: { type: Object },
    utilization: { type: Number },
    metrics: { type: Object },
  }],
  tags: [{ type: String }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

resourceGroupSchema.index({ type: 1 });
resourceGroupSchema.index({ name: 1 });

export const ResourceGroup = mongoose.model('ResourceGroup', resourceGroupSchema);
