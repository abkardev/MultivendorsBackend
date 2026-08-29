import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'document', 'note'], required: true },
  url: { type: String },
  note: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
});

const disputeSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    evidence: [evidenceSchema],
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_refund', 'resolved_release', 'closed'],
      default: 'open',
    },
    adminNotes: { type: String },
    resolution: {
      decision: { type: String, enum: ['refund', 'release'] },
      amount: { type: Number },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date },
      notes: { type: String },
    },
  },
  { timestamps: true }
);

disputeSchema.index({ order: 1 });
disputeSchema.index({ buyer: 1 });
disputeSchema.index({ vendor: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ buyer: 1, status: 1 });
disputeSchema.index({ vendor: 1, status: 1 });

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;
