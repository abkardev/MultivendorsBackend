import mongoose from 'mongoose';

const reportDashboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  reports: [{
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportDefinition' },
    position: {
      x: { type: Number },
      y: { type: Number },
      w: { type: Number },
      h: { type: Number },
    },
    filters: { type: mongoose.Schema.Types.Mixed },
  }],
  layout: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isShared: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

reportDashboardSchema.index({ createdBy: 1, status: 1 });
reportDashboardSchema.index({ isShared: 1, sharedWith: 1 });

const ReportDashboard = mongoose.model('ReportDashboard', reportDashboardSchema);
export default ReportDashboard;
