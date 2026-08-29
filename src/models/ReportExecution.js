import mongoose from 'mongoose';

const reportExecutionSchema = new mongoose.Schema({
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportDefinition', required: true },
  parameters: { type: mongoose.Schema.Types.Mixed },
  output: {
    pdf: { type: String },
    excel: { type: String },
    csv: { type: String },
    json: { type: String },
  },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  size: { type: Number },
  error: { type: String },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggerType: { type: String, enum: ['manual', 'scheduled', 'api'], default: 'manual' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

reportExecutionSchema.index({ report: 1, status: 1 });
reportExecutionSchema.index({ triggeredBy: 1, createdAt: -1 });
reportExecutionSchema.index({ status: 1, startedAt: 1 });
reportExecutionSchema.index({ triggerType: 1, status: 1 });

const ReportExecution = mongoose.model('ReportExecution', reportExecutionSchema);
export default ReportExecution;
