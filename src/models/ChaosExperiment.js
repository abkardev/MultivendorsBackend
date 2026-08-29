import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['failure', 'latency', 'network', 'resource', 'load'], required: true },
  target: { type: String, enum: ['database', 'cache', 'queue', 'api', 'worker', 'service'], required: true },
  scenario: { type: String, enum: ['db_failure', 'cache_failure', 'queue_failure', 'network_latency', 'api_timeout', 'service_degradation', 'worker_outage', 'resource_exhaustion'], required: true },
  status: { type: String, enum: ['draft', 'running', 'completed', 'failed', 'stopped'], default: 'draft' },
  duration: { type: Number },
  parameters: {
    failureRate: { type: Number },
    latencyMs: { type: Number },
    timeoutMs: { type: Number },
    errorCode: { type: String },
    resourcePercentage: { type: Number },
  },
  impact: {
    requestsAffected: { type: Number },
    errorsGenerated: { type: Number },
    avgLatencyIncrease: { type: Number },
    servicesDegraded: [{ type: String }],
  },
  isSimulated: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ target: 1 });
schema.index({ status: 1 });
schema.index({ createdBy: 1 });

export const ChaosExperiment = mongoose.model('ChaosExperiment', schema);
