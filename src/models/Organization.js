import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  email: String,
  phone: String,
  address: String,
  website: String,
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  slug: { type: String, unique: true, required: true },
  logo: String,
  description: String,
  type: {
    type: String,
    enum: ['buyer', 'supplier', 'partner', 'enterprise', 'government'],
    default: 'enterprise',
  },
  industry: String,
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'enterprise'],
    default: 'medium',
  },
  contactInfo: contactInfoSchema,
  settings: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active',
  },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true, toJSON: { virtuals: true } });

organizationSchema.index({ slug: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ parent: 1 });

export const Organization = mongoose.model('Organization', organizationSchema);
