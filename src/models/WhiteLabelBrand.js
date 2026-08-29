import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  logo: { type: String },
  favicon: { type: String },
  loginBranding: {
    logo: { type: String },
    backgroundColor: { type: String },
    textColor: { type: String },
    buttonColor: { type: String },
    backgroundImage: { type: String },
  },
  dashboardBranding: {
    logo: { type: String },
    sidebarColor: { type: String },
    headerColor: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },
    accentColor: { type: String },
  },
  emailBranding: {
    logo: { type: String },
    primaryColor: { type: String },
    footer: { type: String },
    footerText: { type: String },
  },
  invoiceBranding: {
    logo: { type: String },
    companyName: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    taxId: { type: String },
    primaryColor: { type: String },
    footer: { type: String },
  },
  pdfBranding: {
    logo: { type: String },
    primaryColor: { type: String },
    footer: { type: String },
    header: { type: String },
  },
  colors: {
    primary: { type: String },
    secondary: { type: String },
    accent: { type: String },
    background: { type: String },
    text: { type: String },
    error: { type: String },
    success: { type: String },
    warning: { type: String },
    info: { type: String },
  },
  typography: {
    fontFamily: { type: String },
    headingFont: { type: String },
    baseSize: { type: String },
    headingSizes: { type: mongoose.Schema.Types.Mixed },
  },
  cssVariables: { type: Map, of: String },
  companyInfo: {
    name: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    taxId: { type: String },
    registrationNumber: { type: String },
  },
  legalPages: {
    termsUrl: { type: String },
    privacyUrl: { type: String },
    cookiesUrl: { type: String },
    refundUrl: { type: String },
    aboutUrl: { type: String },
    contactUrl: { type: String },
  },
  footer: {
    text: { type: String },
    links: [{ label: { type: String }, url: { type: String } }],
  },
  header: {
    logo: { type: String },
    links: [{ label: { type: String }, url: { type: String } }],
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ code: 1 });
schema.index({ isActive: 1 });
schema.index({ isDefault: 1 });

export const WhiteLabelBrand = mongoose.model('WhiteLabelBrand', schema);
