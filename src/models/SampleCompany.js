import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoDataset', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['manufacturing', 'supplier', 'buyer', 'distributor'],
    required: true,
  },
  companyData: {
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    taxId: { type: String },
    industry: { type: String },
    size: { type: String },
    revenue: { type: String },
    employees: { type: Number },
  },
  contacts: [{
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    role: { type: String },
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ dataset: 1, name: 1 }, { unique: true });
schema.index({ dataset: 1 });
schema.index({ type: 1 });

export const SampleCompany = mongoose.model('SampleCompany', schema);
