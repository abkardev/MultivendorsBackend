import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  period: {
    start: { type: Date },
    end: { type: Date },
  },
  type: {
    type: String,
    enum: ['seats', 'storage', 'ai_tokens', 'api_calls', 'bandwidth'],
    required: true,
  },
  usage: {
    consumed: { type: Number },
    limit: { type: Number },
    overage: { type: Number },
  },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['pending', 'billed', 'waived', 'disputed'],
    default: 'pending',
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ tenant: 1, type: 1, 'period.start': 1, 'period.end': 1 });

export const UsageBilling = mongoose.model('UsageBilling', schema);
