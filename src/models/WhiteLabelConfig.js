import mongoose from 'mongoose';

const whiteLabelConfigSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  primaryColor: { type: String },
  secondaryColor: { type: String },
  logo: { type: String },
  favicon: { type: String },
  customDomain: { type: String },
  customCss: { type: String },
  footerText: {
    en: { type: String },
    ar: { type: String },
  },
  legalPages: {
    terms: { type: String },
    privacy: { type: String },
    about: { type: String },
  },
  emailConfig: {
    smtp: { type: String },
    fromName: { type: String },
    fromEmail: { type: String },
    logo: { type: String },
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

whiteLabelConfigSchema.index({ tenant: 1 });
whiteLabelConfigSchema.index({ customDomain: 1 }, { sparse: true });
whiteLabelConfigSchema.index({ isActive: 1 });

const WhiteLabelConfig = mongoose.model('WhiteLabelConfig', whiteLabelConfigSchema);
export default WhiteLabelConfig;
