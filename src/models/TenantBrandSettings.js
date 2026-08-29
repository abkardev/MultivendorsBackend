import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'WhiteLabelBrand' },
  theme: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandTheme' },
  customDomain: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomDomain' },
  settings: {
    useDefaultBranding: { type: Boolean },
    overrideLogo: { type: String },
    overrideFavicon: { type: String },
    overrideColors: { type: mongoose.Schema.Types.Mixed },
    overrideTypography: { type: mongoose.Schema.Types.Mixed },
    customCss: { type: String },
    customJs: { type: String },
  },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ tenant: 1 });
schema.index({ brand: 1 });
schema.index({ theme: 1 });
schema.index({ isActive: 1 });

export const TenantBrandSettings = mongoose.model('TenantBrandSettings', schema);
