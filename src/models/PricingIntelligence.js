import mongoose from 'mongoose';

const pricingIntelligenceSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  currentPrice: { type: Number, required: true },
  recommendedPrice: { type: Number },
  minPrice: { type: Number },
  maxPrice: { type: Number },
  marketAverage: { type: Number },
  competitorCount: { type: Number, default: 0 },
  competitorPrices: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: String,
    price: Number,
    currency: String,
    lastUpdated: Date,
  }],
  historicalPrices: [{
    price: Number,
    date: Date,
    source: { type: String, enum: ['manual', 'competitor', 'market'] },
  }],
  priceElasticity: { type: Number },
  demandAtPricePoints: [{ price: Number, estimatedDemand: Number, confidence: Number }],
  marginAnalysis: {
    costPrice: Number,
    currentMargin: Number,
    recommendedMargin: Number,
    breakEvenUnits: Number,
  },
  moqAnalysis: {
    currentMoq: Number,
    recommendedMoq: Number,
    impactOnSales: { type: String, enum: ['positive', 'negative', 'neutral'] },
    optimalMoq: Number,
  },
  discountSimulation: [{
    discountPercent: Number,
    estimatedRevenue: Number,
    estimatedProfit: Number,
    estimatedVolume: Number,
    impactOnMargin: Number,
  }],
  aiRecommendation: {
    action: { type: String, enum: ['increase', 'decrease', 'maintain', 'optimize'] },
    reason: String,
    confidence: Number,
    expectedImpact: String,
  },
  calculatedAt: { type: Date },
}, { timestamps: true });

pricingIntelligenceSchema.index({ vendor: 1, product: 1 }, { unique: true });

export const PricingIntelligence = mongoose.model('PricingIntelligence', pricingIntelligenceSchema);
