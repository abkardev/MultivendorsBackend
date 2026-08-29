import mongoose from 'mongoose';

const marketingCampaignSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['email', 'whatsapp', 'announcement', 'promotion', 'coupon', 'seasonal'], required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'], default: 'draft' },
  subject: { en: String, ar: String },
  content: { en: String, ar: String },
  templateId: { type: mongoose.Schema.Types.ObjectId },
  targetAudience: {
    tags: [String],
    countries: [String],
    industries: [String],
    minOrders: Number,
    maxOrders: Number,
    minRevenue: Number,
    minHealthScore: Number,
  },
  schedule: {
    sendAt: Date,
    timezone: { type: String, default: 'UTC' },
    completedAt: Date,
  },
  analytics: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    roi: { type: Number, default: 0 },
  },
  cost: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

marketingCampaignSchema.index({ vendor: 1, status: 1 });
marketingCampaignSchema.index({ vendor: 1, type: 1 });

export const MarketingCampaign = mongoose.model('MarketingCampaign', marketingCampaignSchema);
