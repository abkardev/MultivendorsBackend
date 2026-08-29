import mongoose from 'mongoose';

const organizationRelationshipSchema = new mongoose.Schema({
  sourceOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  targetOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  type: {
    type: String,
    enum: ['parent_subsidiary', 'partner', 'supplier_buyer', 'sister_company'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated'],
    default: 'pending',
  },
  permissions: [String],
  metadata: mongoose.Schema.Types.Mixed,
  establishedAt: Date,
}, { timestamps: true, toJSON: { virtuals: true } });

organizationRelationshipSchema.index({ sourceOrg: 1, targetOrg: 1 }, { unique: true });
organizationRelationshipSchema.index({ sourceOrg: 1, status: 1 });
organizationRelationshipSchema.index({ targetOrg: 1, status: 1 });
organizationRelationshipSchema.index({ type: 1 });

export const OrganizationRelationship = mongoose.model('OrganizationRelationship', organizationRelationshipSchema);
