import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { en: String, ar: String },
  quantity: { type: Number, required: true, min: 1 },
  unit: String,
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, min: 0 },
  moq: Number,
  leadTimeDays: Number,
  notes: String,
});

const quotationSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true, required: true },
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'sent', 'pending', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'draft',
  },
  items: [quotationItemSchema],
  subtotal: { type: Number, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, min: 0 },
  currency: { type: String, default: 'USD' },
  paymentTerms: [String],
  incoterms: String,
  validUntil: { type: Date },
  expiredAt: { type: Date },
  leadTimeMin: { type: Number, min: 0 },
  leadTimeMax: { type: Number, min: 0 },
  countryOfOrigin: String,
  certifications: [String],
  warranty: String,
  deliveryTime: String,
  notes: String,
  termsAndConditions: String,
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  responseTimeHours: { type: Number, min: 0 },
  submittedAt: Date,
  respondedAt: Date,
  acceptedAt: Date,
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

quotationSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      if (item.unitPrice && item.quantity) {
        item.totalPrice = item.unitPrice * item.quantity;
      }
    });
    this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.totalAmount = (this.subtotal || 0) + (this.tax || 0) + (this.shipping || 0);
  }
  next();
});

quotationSchema.index({ buyer: 1, status: 1 });
quotationSchema.index({ vendor: 1, status: 1 });
quotationSchema.index({ rfq: 1 });
quotationSchema.index({ validUntil: 1 }, { expireAfterSeconds: 0 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ buyer: 1, createdAt: -1 });
quotationSchema.index({ vendor: 1, createdAt: -1 });

export const Quotation = mongoose.model('Quotation', quotationSchema);
