import mongoose from 'mongoose';

const productPerformanceSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  totalViews: { type: Number, default: 0 },
  totalRfqs: { type: Number, default: 0 },
  totalQuotes: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalUnitsSold: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  averageNegotiationDiscount: { type: Number, default: 0 },
  repeatPurchaseRate: { type: Number, default: 0 },
  buyerCountries: [{ name: String, count: Number }],
  buyerIndustries: [{ name: String, count: Number }],
  priceHistory: [{ price: Number, date: Date }],
  demandTrend: { type: String, enum: ['rising', 'stable', 'declining'], default: 'stable' },
  profitEstimate: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },
  rank: { type: Number },
  aiRecommendations: [{ type: String }],
  calculatedAt: { type: Date },
}, { timestamps: true });

productPerformanceSchema.index({ vendor: 1, totalRevenue: -1 });
productPerformanceSchema.index({ vendor: 1, conversionRate: -1 });
productPerformanceSchema.index({ vendor: 1, totalRfqs: -1 });

export const ProductPerformance = mongoose.model('ProductPerformance', productPerformanceSchema);
