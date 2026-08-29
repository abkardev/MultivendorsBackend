import mongoose from 'mongoose';

const knowledgeRelationshipSchema = new mongoose.Schema({
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true },
  type: {
    type: String,
    enum: [
      'buys', 'sells', 'belongs_to', 'approved_by', 'references',
      'related_to', 'depends_on', 'managed_by', 'assigned_to',
      'supplied_by', 'reviewed_by', 'connected_to', 'similar_to',
      'replaces', 'duplicates', 'recommended_with'
    ],
    required: true
  },
  weight: { type: Number, min: 0, max: 1, default: 0.5 },
  properties: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

knowledgeRelationshipSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });
knowledgeRelationshipSchema.index({ type: 1, weight: -1 });

export const KnowledgeRelationship = mongoose.model('KnowledgeRelationship', knowledgeRelationshipSchema);
