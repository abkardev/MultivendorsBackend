import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'WhiteLabelBrand', required: true },
  type: { type: String, enum: ['light', 'dark', 'custom'], default: 'custom' },
  isDefault: { type: Boolean, default: false },
  colors: {
    primary: { type: String },
    secondary: { type: String },
    accent: { type: String },
    background: { type: String },
    surface: { type: String },
    text: { type: String },
    textSecondary: { type: String },
    border: { type: String },
    error: { type: String },
    success: { type: String },
    warning: { type: String },
    info: { type: String },
  },
  typography: {
    fontFamily: { type: String },
    headingFont: { type: String },
    fontSize: { type: mongoose.Schema.Types.Mixed },
  },
  borderRadius: {
    sm: { type: String },
    md: { type: String },
    lg: { type: String },
    xl: { type: String },
  },
  spacing: {
    xs: { type: String },
    sm: { type: String },
    md: { type: String },
    lg: { type: String },
    xl: { type: String },
  },
  shadows: {
    sm: { type: String },
    md: { type: String },
    lg: { type: String },
    xl: { type: String },
  },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ brand: 1 });
schema.index({ type: 1 });
schema.index({ isDefault: 1 });
schema.index({ isActive: 1 });

export const BrandTheme = mongoose.model('BrandTheme', schema);
