import mongoose from 'mongoose';

const negotiationRoundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  initiatedBy: { type: String, enum: ['buyer', 'vendor'], required: true },
  type: { type: String, enum: ['initial', 'counter', 'acceptance', 'decline', 'withdrawal'], required: true },
  message: String,
  proposedPrice: { type: Number, min: 0 },
  proposedMoq: { type: Number, min: 1 },
  proposedLeadTimeMin: { type: Number, min: 0 },
  proposedLeadTimeMax: { type: Number, min: 0 },
  proposedPaymentTerms: [String],
  proposedIncoterms: String,
  proposedDeliveryDate: Date,
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
});

const negotiationSchema = new mongoose.Schema({
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['open', 'buyer_countered', 'vendor_countered', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'open',
  },
  rounds: [negotiationRoundSchema],
  currentRound: { type: Number, default: 1 },
  expiresAt: Date,
  acceptedAt: Date,
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedRound: Number,
  completedAt: Date,
}, { timestamps: true });

negotiationSchema.index({ buyer: 1, status: 1 });
negotiationSchema.index({ vendor: 1, status: 1 });
negotiationSchema.index({ quotation: 1 });
negotiationSchema.index({ status: 1, createdAt: -1 });
negotiationSchema.index({ buyer: 1, createdAt: -1 });
negotiationSchema.index({ vendor: 1, createdAt: -1 });
negotiationSchema.index({ rfq: 1 });

export const Negotiation = mongoose.model('Negotiation', negotiationSchema);
