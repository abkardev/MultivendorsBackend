import mongoose from 'mongoose';

const eventConditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed
}, { _id: false });

const eventActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'notify', 'create_task', 'start_workflow', 'call_agent',
      'assign_user', 'generate_report', 'update_entity',
      'recalculate_intelligence', 'escalate', 'request_approval'
    ],
    required: true
  },
  config: mongoose.Schema.Types.Mixed
}, { _id: false });

const eventRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  event: {
    type: String,
    enum: [
      'order_created', 'order_approved', 'rfq_created', 'rfq_closed',
      'payment_completed', 'escrow_released', 'review_approved',
      'supplier_verified', 'buyer_verified', 'company_approved',
      'subscription_changed', 'fraud_alert', 'compliance_alert',
      'risk_alert', 'ai_recommendation', 'workflow_completed'
    ],
    required: true
  },
  conditions: [eventConditionSchema],
  actions: [eventActionSchema],
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 }
}, { timestamps: true });

eventRuleSchema.index({ event: 1, isActive: 1 });
eventRuleSchema.index({ priority: -1 });

export const EventRule = mongoose.model('EventRule', eventRuleSchema);
