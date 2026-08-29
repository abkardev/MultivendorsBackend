import mongoose from 'mongoose';

const buyerReputationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentScore: { type: Number, default: 0, min: 0, max: 100 },
  previousScore: { type: Number, default: 0 },
  scoreHistory: [{
    score: Number,
    reason: String,
    calculatedAt: { type: Date, default: Date.now },
  }],
  label: {
    type: String,
    enum: ['new_buyer', 'reliable_buyer', 'trusted_buyer', 'gold_buyer', 'enterprise_buyer'],
    default: 'new_buyer',
  },
  statistics: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    disputesOpened: { type: Number, default: 0 },
    disputesLost: { type: Number, default: 0 },
    averagePaymentTime: { type: Number, default: 0 },
    repeatPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    yearsActive: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  lastCalculatedAt: Date,
}, { timestamps: true });

buyerReputationSchema.index({ currentScore: -1 });

export default mongoose.model('BuyerReputation', buyerReputationSchema);
