import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportSession' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  type: {
    type: String,
    enum: ['system', 'performance', 'security', 'configuration', 'full'],
    default: 'full',
  },
  status: {
    type: String,
    enum: ['pending', 'collecting', 'completed', 'failed'],
    default: 'pending',
  },
  data: {
    system: { type: Object },
    configuration: { type: Object },
    performance: { type: Object },
    security: { type: Object },
    errors: { type: Object },
    logs: { type: Object },
  },
  size: { type: Number },
  checksum: { type: String },
  expiresAt: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ session: 1 });
schema.index({ tenant: 1 });
schema.index({ status: 1 });

export const DiagnosticBundle = mongoose.model('DiagnosticBundle', schema);
