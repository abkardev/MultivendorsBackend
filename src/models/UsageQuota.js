import mongoose from 'mongoose';

const usageQuotaSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  period: { type: String, required: true },
  usage: {
    apiCalls: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    users: { type: Number, default: 0 },
    integrations: { type: Number, default: 0 },
    plugins: { type: Number, default: 0 },
    aiTokens: { type: Number, default: 0 },
  },
  limits: {
    apiCalls: { type: Number },
    storage: { type: Number },
    users: { type: Number },
    integrations: { type: Number },
    plugins: { type: Number },
    aiTokens: { type: Number },
  },
  exceeded: [{ type: String }],
  lastResetAt: { type: Date },
  nextResetAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

usageQuotaSchema.index({ tenant: 1, period: 1 }, { unique: true });
usageQuotaSchema.index({ period: 1 });
usageQuotaSchema.index({ 'exceeded': 1 });

const UsageQuota = mongoose.model('UsageQuota', usageQuotaSchema);
export default UsageQuota;
