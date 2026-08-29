import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'ReliabilityIncident' },
  title: { type: String, required: true },
  status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
  symptoms: [{
    type: { type: String },
    description: { type: String },
    timestamp: { type: Date },
    evidence: { type: String },
  }],
  rootCause: {
    type: { type: String },
    description: { type: String },
    service: { type: String },
    component: { type: String },
    confidence: { type: Number },
    evidence: [{ type: String }],
  },
  timeline: [{
    timestamp: { type: Date },
    event: { type: String },
    service: { type: String },
    impact: { type: String },
  }],
  impact: {
    duration: { type: Number },
    usersAffected: { type: Number },
    requestsLost: { type: Number },
    revenueImpact: { type: Number },
    slaBreached: { type: Boolean },
  },
  recommendations: [{
    priority: { type: String },
    category: { type: String },
    description: { type: String },
    actionItems: [{ type: String }],
    owner: { type: String },
    deadline: { type: Date },
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ incident: 1 });
schema.index({ title: 1 });
schema.index({ status: 1 });

export const RootCauseAnalysis = mongoose.model('RootCauseAnalysis', schema);
