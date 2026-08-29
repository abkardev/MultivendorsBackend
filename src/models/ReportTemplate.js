import mongoose from 'mongoose';

const reportTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['chart', 'table', 'pivot', 'custom'],
    required: true
  },
  category: String,
  config: {
    metrics: [String],
    dimensions: [String],
    filters: mongoose.Schema.Types.Mixed,
    chartType: {
      type: String,
      enum: ['bar', 'line', 'pie', 'area', 'heatmap', 'scatter', 'table', 'pivot']
    },
    grouping: String,
    sorting: String,
    limit: Number
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    cron: String,
    recipients: [String],
    format: [String]
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublic: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

reportTemplateSchema.index({ type: 1, category: 1 });
reportTemplateSchema.index({ createdBy: 1 });
reportTemplateSchema.index({ isPublic: 1 });

export const ReportTemplate = mongoose.model('ReportTemplate', reportTemplateSchema);
