import mongoose from 'mongoose';

const agentTaskSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSession', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  agent: { type: String, required: true },
  action: { type: String, required: true },
  priority: { type: Number, default: 50, min: 1, max: 100 },
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed', 'cancelled', 'pending_approval'], default: 'queued' },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentTask' }],
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  error: String,
  retries: { type: Number, default: 0, max: 5 },
  maxRetries: { type: Number, default: 3 },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  executionTime: Number,
  worker: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

agentTaskSchema.index({ status: 1, priority: -1, createdAt: 1 });
agentTaskSchema.index({ session: 1, agent: 1 });
export default mongoose.model('AgentTask', agentTaskSchema);
