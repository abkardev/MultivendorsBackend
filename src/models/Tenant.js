import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  domain: { type: String },
  logo: { type: String },
  favicon: { type: String },
  brandColor: { type: String },
  theme: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['active', 'suspended', 'trial', 'cancelled'], default: 'active' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  features: [{ type: String }],
  settings: {
    allowRegistration: { type: Boolean, default: false },
    requireVerification: { type: Boolean, default: true },
    maxUsers: { type: Number },
    storageLimit: { type: Number },
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

tenantSchema.index({ slug: 1 });
tenantSchema.index({ domain: 1 }, { sparse: true });
tenantSchema.index({ status: 1 });

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
