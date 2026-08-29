import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  factory: { type: mongoose.Schema.Types.ObjectId, ref: 'FactoryProfile' },

  rating: { type: Number, required: true, min: 1, max: 5 },
  productQuality: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  delivery: { type: Number, min: 1, max: 5 },
  packaging: { type: Number, min: 1, max: 5 },
  service: { type: Number, min: 1, max: 5 },

  title: { type: String, maxlength: 200 },
  comment: { type: String, maxlength: 5000 },
  recommendation: { type: String, enum: ['yes', 'no', 'maybe'] },

  media: [{
    type: { type: String, enum: ['image', 'video', 'document'] },
    url: String,
    thumbnailUrl: String,
    isApproved: { type: Boolean, default: false },
    moderatedAt: Date,
  }],

  isVerifiedPurchase: { type: Boolean, default: false },

  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending',
  },
  moderationHistory: [{
    action: { type: String, enum: ['approved', 'rejected', 'hidden', 'restored', 'flagged'] },
    reason: String,
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date, default: Date.now },
  }],

  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['spam', 'fake_review', 'offensive', 'harassment', 'wrong_product', 'duplicate', 'other'] },
    description: String,
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  }],
  reportCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },

  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notHelpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },

  vendorResponse: {
    comment: { type: String, maxlength: 5000 },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    editCount: { type: Number, default: 0 },
  },

  reviewType: {
    type: String,
    enum: ['product', 'vendor', 'buyer', 'factory'],
    default: 'product',
  },

  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

reviewSchema.index({ order: 1, reviewType: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ vendor: 1, moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ moderationStatus: 1, isVerifiedPurchase: 1 });
reviewSchema.index({ helpfulCount: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isDeleted: 1, moderationStatus: 1 });

export default mongoose.model('Review', reviewSchema);
