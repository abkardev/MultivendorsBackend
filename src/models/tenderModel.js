import mongoose from 'mongoose';

const tenderBidSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  message: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  deliveryDays: Number,
  attachments: [String],
  status: { type: String, enum: ['submitted', 'shortlisted', 'accepted', 'rejected'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
});

const tenderSchema = new mongoose.Schema({
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
  budget: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' },
  },
  deadline: { type: Date, required: true },
  attachments: [String],
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  invitedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  status: { type: String, enum: ['open', 'under_review', 'awarded', 'cancelled', 'closed'], default: 'open' },
  bids: [tenderBidSchema],
  awardedBid: { type: mongoose.Schema.Types.ObjectId },
  awardedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  awardedAt: Date,
}, { timestamps: true });

tenderSchema.index({ status: 1, deadline: 1 });
tenderSchema.index({ buyer: 1 });
tenderSchema.index({ 'bids.vendor': 1 });
tenderSchema.index({ createdAt: -1 });
tenderSchema.index({ buyer: 1, status: 1, createdAt: -1 });
tenderSchema.index({ status: 1, createdAt: -1 });
tenderSchema.index({ 'title.en': 'text', 'title.ar': 'text', 'description.en': 'text', 'description.ar': 'text' });
tenderSchema.index({ category: 1 });

export const Tender = mongoose.model('Tender', tenderSchema);
