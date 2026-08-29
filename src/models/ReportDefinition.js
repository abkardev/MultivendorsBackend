import mongoose from 'mongoose';

const reportDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  type: { type: String, enum: ['table', 'chart', 'pivot', 'summary'], required: true },
  config: { type: mongoose.Schema.Types.Mixed },
  dataSource: { type: String },
  parameters: [{
    name: { type: String },
    type: { type: String },
    label: { type: String },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
  }],
  layout: {
    sections: { type: mongoose.Schema.Types.Mixed },
    columns: { type: mongoose.Schema.Types.Mixed },
  },
  formatting: {
    colors: { type: mongoose.Schema.Types.Mixed },
    font: { type: String },
    header: { type: mongoose.Schema.Types.Mixed },
    footer: { type: mongoose.Schema.Types.Mixed },
  },
  schedules: [{
    cron: { type: String },
    recipients: [{ type: String }],
    format: { type: String, enum: ['pdf', 'excel', 'csv'] },
    enabled: { type: Boolean, default: true },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  version: { type: Number, default: 1 },
  isTemplate: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

reportDefinitionSchema.index({ createdBy: 1, status: 1 });
reportDefinitionSchema.index({ category: 1, status: 1 });
reportDefinitionSchema.index({ isTemplate: 1 });

const ReportDefinition = mongoose.model('ReportDefinition', reportDefinitionSchema);
export default ReportDefinition;
