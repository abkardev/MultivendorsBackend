import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  name: String,
  description: String,
  dueDate: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending' },
  completedAt: Date,
}, { _id: false });

const versionSchema = new mongoose.Schema({
  version: Number,
  changes: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  snapshot: Object,
}, { timestamps: true });

const procurementPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  businessObjective: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'approved', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
  budget: { type: Number },
  currency: { type: String, default: 'SAR' },
  countries: [String],
  targetCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  targetSuppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  deliveryDeadline: Date,
  qualityRequirements: String,
  requiredCertifications: [String],
  incoterms: String,
  shipmentPreference: String,
  preferredPaymentMethod: String,
  escrowPreference: { type: Boolean, default: true },
  milestones: [milestoneSchema],
  approvalWorkflow: [{ approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, comment: String, reviewedAt: Date }],
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
  estimatedSavings: { type: Number, default: 0 },
  playbook: String,
  calendarEvents: [{ title: String, startDate: Date, endDate: Date, type: String }],
  version: { type: Number, default: 1 },
  versions: [versionSchema],
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

procurementPlanSchema.index({ user: 1, status: 1, createdAt: -1 });
export default mongoose.model('ProcurementPlan', procurementPlanSchema);
