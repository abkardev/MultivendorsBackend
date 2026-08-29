import mongoose from 'mongoose';

const vendorReputationSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, unique: true },
  currentScore: { type: Number, default: 0, min: 0, max: 100 },
  previousScore: { type: Number, default: 0 },
  scoreHistory: [{
    score: Number,
    reason: String,
    calculatedAt: { type: Date, default: Date.now },
  }],
  scoreBreakdown: {
    verification: { type: Number, default: 0, max: 15 },
    orders: { type: Number, default: 0, max: 20 },
    delivery: { type: Number, default: 0, max: 15 },
    communication: { type: Number, default: 0, max: 10 },
    reviews: { type: Number, default: 0, max: 15 },
    disputes: { type: Number, default: 0, max: 10 },
    longevity: { type: Number, default: 0, max: 5 },
    exports: { type: Number, default: 0, max: 5 },
    badges: { type: Number, default: 0, max: 5 },
  },
  lastCalculatedAt: Date,
  nextCalculationAt: Date,
  calculationInterval: { type: Number, default: 3600000 },
}, { timestamps: true });

vendorReputationSchema.index({ currentScore: -1 });

export default mongoose.model('VendorReputation', vendorReputationSchema);
