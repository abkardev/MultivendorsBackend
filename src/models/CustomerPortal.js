import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  domain: { type: String },
  branding: {
    logo: { type: String },
    primaryColor: { type: String },
    companyName: { type: String },
  },
  features: [{
    feature: { type: String },
    enabled: { type: Boolean },
    config: { type: Object },
  }],
  sections: [{
    name: { type: String },
    type: { type: String },
    enabled: { type: Boolean },
    sortOrder: { type: Number },
  }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 }, { unique: true });
schema.index({ domain: 1 });
schema.index({ isActive: 1 });

export const CustomerPortal = mongoose.model('CustomerPortal', schema);
