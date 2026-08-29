import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['manufacturing', 'retail', 'healthcare', 'education', 'construction', 'general'],
    default: 'general',
  },
  size: { type: String },
  recordCount: { type: Number },
  includes: [{ type: String }],
  data: {
    companies: { type: Array },
    suppliers: { type: Array },
    buyers: { type: Array },
    products: { type: Array },
    categories: { type: Array },
    rfqs: { type: Array },
    orders: { type: Array },
    procurementPlans: { type: Array },
    aiConversations: { type: Array },
    dashboards: { type: Array },
    reports: { type: Array },
    analytics: { type: Array },
    executiveInsights: { type: Array },
  },
  isDefault: { type: Boolean, default: false },
  version: { type: String },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ name: 1 }, { unique: true });
schema.index({ type: 1 });
schema.index({ isDefault: 1 });

export const DemoDataset = mongoose.model('DemoDataset', schema);
