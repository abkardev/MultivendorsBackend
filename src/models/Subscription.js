import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planType: { type: String, enum: ['starter', 'growth', 'pro'], required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'canceled', 'pending', 'past_due'],
      default: 'pending',
      index: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true }, // start + 1 year
    commissionRate: { type: Number, required: true }, // can be overridden by admin
    features: { type: Schema.Types.Mixed, required: true }, // snapshot of plan.features at purchase
    stripeSubscriptionId: { type: String, index: true, sparse: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    autoRenew: { type: Boolean, default: true },
    canceledAt: { type: Date },
    adminOverride: { type: Boolean, default: false }, // true if commissionRate was changed by admin
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });
SubscriptionSchema.index({ endDate: 1 });

// Helper: returns the user's currently active subscription, or null.
SubscriptionSchema.statics.findActiveForUser = function (userId) {
  return this.findOne({ userId, status: 'active', endDate: { $gte: new Date() } });
};

const Subscription = mongoose.model('Subscription', SubscriptionSchema);
export default Subscription;
