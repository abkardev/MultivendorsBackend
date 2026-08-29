import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  company: { type: String, required: true, trim: true },
  contactName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  country: { type: String },
  industry: { type: String },
  source: { type: String },
  stage: {
    type: String,
    enum: ['new', 'qualified', 'contacted', 'negotiating', 'waiting', 'won', 'lost'],
    default: 'new',
  },
  score: { type: Number, min: 0, max: 100, default: 0 },
  aiQualification: {
    score: Number,
    summary: String,
    recommendations: [String],
    qualifiedAt: Date,
  },
  expectedRevenue: { type: Number, default: 0 },
  probability: { type: Number, min: 0, max: 100, default: 10 },
  estimatedValue: { type: Number, default: 0 },
  currency: { type: String, default: 'SAR' },
  notes: { type: String },
  tags: [String],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastContactedAt: Date,
  nextFollowUpAt: Date,
  convertedAt: Date,
  convertedToCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerCustomer' },
  lostAt: Date,
  lostReason: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

leadSchema.index({ vendor: 1, stage: 1 });
leadSchema.index({ vendor: 1, score: -1 });
leadSchema.index({ vendor: 1, isActive: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
