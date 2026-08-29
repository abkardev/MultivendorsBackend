import mongoose from 'mongoose';

const procurementProjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 200 },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'active' },
  rfqs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' }],
  quotations: [{ type: mongoose.Schema.Types.ObjectId }],
  suppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  notes: [{ content: String, createdAt: { type: Date, default: Date.now } }],
  attachments: [{ name: String, url: String, type: String }],
  deadline: Date,
  budget: Number,
  currency: { type: String, default: 'SAR' },
}, { timestamps: true });

procurementProjectSchema.index({ user: 1, status: 1, createdAt: -1 });
export default mongoose.model('ProcurementProject', procurementProjectSchema);
