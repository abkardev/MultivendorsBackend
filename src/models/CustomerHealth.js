import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  healthScore: { type: Number, default: 100 },
  metrics: {
    productAdoption: { type: Number },
    activeUsers: { type: Number },
    renewalProbability: { type: Number },
    expansionOpportunities: { type: Number },
    churnRisk: { type: Number },
    trainingProgress: { type: Number },
    supportTickets: { type: Number },
    loginFrequency: { type: Number },
    featureUsage: { type: Number },
    dataGrowth: { type: Number },
  },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  successMilestones: [{
    name: { type: String },
    achieved: { type: Boolean },
    achievedAt: { type: Date },
    description: { type: String },
  }],
  recommendations: [{
    type: { type: String },
    title: { type: String },
    description: { type: String },
    priority: { type: String },
    status: { type: String },
    createdAt: { type: Date },
  }],
  lastCalculated: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ healthScore: -1 });
schema.index({ riskLevel: 1 });

export const CustomerHealth = mongoose.model('CustomerHealth', schema);
