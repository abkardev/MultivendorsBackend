import mongoose from 'mongoose';

const sellerAutomationRuleSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'quotation_expiry_reminder', 'rfq_follow_up', 'inactive_customer',
      'delivery_follow_up', 'repeat_order_reminder', 'buyer_anniversary',
      'auto_follow_up', 'pipeline_reminder', 'goal_reminder', 'ai_recommendation',
    ],
    required: true,
  },
  trigger: {
    event: { type: String, required: true },
    delayHours: { type: Number, default: 0 },
    conditions: [{ field: String, operator: String, value: mongoose.Schema.Types.Mixed }],
  },
  actions: [{
    type: { type: String, enum: ['notification', 'email', 'reminder', 'task', 'whatsapp'], required: true },
    config: { type: mongoose.Schema.Types.Mixed },
  }],
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: Date,
  triggerCount: { type: Number, default: 0 },
}, { timestamps: true });

sellerAutomationRuleSchema.index({ vendor: 1, type: 1 });

export const SellerAutomationRule = mongoose.model('SellerAutomationRule', sellerAutomationRuleSchema);
