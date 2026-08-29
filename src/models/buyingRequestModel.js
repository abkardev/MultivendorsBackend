import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  message: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  deliveryDays: Number,
  moq: Number,
  status: { type: String, enum: ['submitted', 'accepted', 'rejected'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
});

const buyingRequestSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: {
    en: { type: String, required: true },
    ar: String,
  },
  description: {
    en: { type: String, required: true },
    ar: String,
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  quantity: { type: Number, required: true },
  unit: String,
  budget: { type: Number },
  currency: { type: String, default: 'USD' },
  images: [String],
  status: { type: String, enum: ['open', 'quoted', 'closed', 'cancelled'], default: 'open' },
  quotes: [quoteSchema],
}, { timestamps: true });

buyingRequestSchema.index({ status: 1, createdAt: -1 });
buyingRequestSchema.index({ buyer: 1 });
buyingRequestSchema.index({ buyer: 1, status: 1, createdAt: -1 });
buyingRequestSchema.index({ category: 1, status: 1 });

export const BuyingRequest = mongoose.model('BuyingRequest', buyingRequestSchema);
