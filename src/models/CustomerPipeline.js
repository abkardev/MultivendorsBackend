import mongoose from 'mongoose';

const customerPipelineSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stage: {
    type: String,
    enum: ['new', 'qualified', 'contacted', 'negotiating', 'waiting', 'won', 'lost'],
    default: 'new',
  },
  leadScore: { type: Number, min: 0, max: 100, default: 0 },
  expectedRevenue: { type: Number, default: 0 },
  probability: { type: Number, min: 0, max: 100, default: 0 },
  source: { type: String },
  notes: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  enteredStageAt: Date,
  wonAt: Date,
  lostAt: Date,
  lostReason: String,
  expectedCloseAt: Date,
  nextTaskAt: Date,
  nextTaskDescription: String,
}, { timestamps: true });

customerPipelineSchema.index({ vendor: 1, stage: 1 });
customerPipelineSchema.index({ vendor: 1, buyer: 1 }, { unique: true });

export const CustomerPipeline = mongoose.model('CustomerPipeline', customerPipelineSchema);
