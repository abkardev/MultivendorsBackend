import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['onboarding', 'adoption', 'expansion', 'retention', 'custom'], default: 'onboarding' },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  milestones: [{
    name: { type: String },
    description: { type: String },
    order: { type: Number },
    dueDate: { type: Date },
    completedAt: { type: Date },
    status: { type: String },
    notes: { type: String },
  }],
  metrics: {
    targetHealthScore: { type: Number },
    targetAdoption: { type: Number },
    targetActiveUsers: { type: Number },
    timeToValue: { type: Number },
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: Date },
  targetDate: { type: Date },
  completedDate: { type: Date },
  notes: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ assignedTo: 1 });

export const SuccessPlan = mongoose.model('SuccessPlan', schema);
