import mongoose from 'mongoose';

const agentSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'AI Procurement Session' },
  businessObjective: { type: String, default: '' },
  status: { type: String, enum: ['active', 'paused', 'completed', 'failed', 'cancelled'], default: 'active' },
  selectedSuppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  generatedRfqs: [{ type: mongoose.Schema.Types.ObjectId }],
  recommendations: [{
    agent: String,
    type: String,
    title: String,
    description: String,
    data: Object,
    createdAt: { type: Date, default: Date.now },
  }],
  workflowState: { type: mongoose.Schema.Types.Mixed, default: {} },
  executionHistory: [{ agent: String, action: String, status: String, startedAt: Date, completedAt: Date, result: Object }],
  approvals: [{ step: String, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, requestedAt: Date, respondedAt: Date, comment: String }],
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

agentSessionSchema.index({ user: 1, status: 1, updatedAt: -1 });
export default mongoose.model('AgentSession', agentSessionSchema);
