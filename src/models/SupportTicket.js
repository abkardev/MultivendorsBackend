import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  portal: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerPortal' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  subject: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'feature_request', 'bug_report', 'other'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    default: 'open',
  },
  messages: [{
    sender: { type: String },
    message: { type: String },
    attachments: [{ type: String }],
    createdAt: { type: Date },
    isInternal: { type: Boolean },
  }],
  attachments: [{ type: String }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  satisfaction: { type: Number },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ portal: 1 });
schema.index({ status: 1 });
schema.index({ priority: 1 });
schema.index({ category: 1 });
schema.index({ assignedTo: 1 });
schema.index({ tenant: 1, status: 1 });
schema.index({ status: 1, priority: 1 });

export const SupportTicket = mongoose.model('SupportTicket', schema);
