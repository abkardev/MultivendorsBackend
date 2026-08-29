import mongoose from 'mongoose';

const featurePackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  features: [{
    feature: { type: String },
    enabled: { type: Boolean, default: true },
    limit: { type: Number },
  }],
  limits: {
    users: { type: Number },
    storage: { type: Number },
    apiCalls: { type: Number },
    integrations: { type: Number },
    plugins: { type: Number },
  },
  price: { type: Number, default: 0 },
  billing: { type: String, enum: ['monthly', 'yearly', 'one_time'], default: 'monthly' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

featurePackageSchema.index({ code: 1 });
featurePackageSchema.index({ isActive: 1, sortOrder: 1 });
featurePackageSchema.index({ billing: 1, price: 1 });

const FeaturePackage = mongoose.model('FeaturePackage', featurePackageSchema);
export default FeaturePackage;
