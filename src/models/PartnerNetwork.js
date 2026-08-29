import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  relationshipType: String,
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending',
  },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const partnerNetworkSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  partners: [partnerSchema],
  networkSettings: mongoose.Schema.Types.Mixed,
}, { timestamps: true, toJSON: { virtuals: true } });

partnerNetworkSchema.index({ organization: 1 }, { unique: true });
partnerNetworkSchema.index({ 'partners.organization': 1 });

export const PartnerNetwork = mongoose.model('PartnerNetwork', partnerNetworkSchema);
