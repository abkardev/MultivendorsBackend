import mongoose from 'mongoose';
import slugify from 'slugify';

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['starter', 'growth', 'pro', 'basic', 'premium'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, required: true },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    storeName: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true },
    },
    slug: {
      type: String,
      unique: true,
    },
    storeDescription: {
      en: { type: String, required: true },
      ar: String,
    },
    storeImage: String,
    storeBanner: String,
    industry: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    verificationDocs: [{
      docType: { type: String, enum: ['business_registration', 'tax_registration', 'certificate_of_origin', 'other'] },
      fileName: String,
      fileUrl: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    verificationReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationReviewedAt: Date,
    verificationNotes: String,
    whatsapp: {
      phone: String,
      notifications: {
        orders: { type: Boolean, default: true },
        shipping: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        rfq: { type: Boolean, default: true },
      },
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    subscription: subscriptionSchema,
    aiHistory: [{
      query: String,
      response: String,
      type: { type: String, enum: ['product', 'rfq', 'general'], default: 'product' },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

vendorSchema.pre('save', function createSlug(next) {
  if (this.isModified('storeName') || !this.slug) {
    this.slug = slugify(this.storeName.en, { lower: true, strict: true });
  }
  next();
});

vendorSchema.index({ isActive: 1, isVerified: 1 });
vendorSchema.index({ verificationStatus: 1, createdAt: -1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ 'storeName.en': 'text', 'storeName.ar': 'text', 'storeDescription.en': 'text', 'storeDescription.ar': 'text' });
vendorSchema.index({ verificationReviewedBy: 1 });

export const Vendor = mongoose.model('Vendor', vendorSchema);
