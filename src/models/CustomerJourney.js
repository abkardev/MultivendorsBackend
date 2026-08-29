import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  stage: { type: String, enum: ['lead', 'trial', 'onboarding', 'active', 'expansion', 'churned', 'reactivated'], default: 'lead' },
  stages: [{
    name: { type: String },
    enteredAt: { type: Date },
    exitedAt: { type: Date },
    duration: { type: Number },
    actions: [{
      type: { type: String },
      description: { type: String },
      timestamp: { type: Date },
      metadata: { type: mongoose.Schema.Types.Mixed },
    }],
  }],
  currentActions: [{
    type: { type: String },
    description: { type: String },
    status: { type: String },
    priority: { type: String },
    dueDate: { type: Date },
    assignedTo: { type: String },
  }],
  touchpoints: [{
    type: { type: String },
    channel: { type: String },
    description: { type: String },
    timestamp: { type: Date },
    satisfaction: { type: Number },
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ stage: 1 });
schema.index({ 'stages.name': 1 });

export const CustomerJourney = mongoose.model('CustomerJourney', schema);
