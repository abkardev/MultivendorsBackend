import mongoose from 'mongoose';

const adCampaignSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: { type: String, required: true },
  description: String,
  image: String,
  placement: {
    type: String,
    enum: ['sponsored', 'banner', 'featured', 'sidebar'],
    default: 'sponsored',
  },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'ended', 'cancelled'],
    default: 'draft',
  },
  startDate: Date,
  endDate: Date,
  targetCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  targetCountry: String,
  dailyBudget: Number,
}, { timestamps: true });

adCampaignSchema.index({ vendor: 1, status: 1 });
adCampaignSchema.index({ status: 1, placement: 1 });
adCampaignSchema.index({ createdAt: -1 });
adCampaignSchema.index({ vendor: 1, createdAt: -1 });
adCampaignSchema.index({ product: 1 });

export const AdCampaign = mongoose.model('AdCampaign', adCampaignSchema);
