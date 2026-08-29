import mongoose from 'mongoose';

const knowledgeEntitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'product', 'company', 'supplier', 'buyer', 'rfq', 'order', 'review',
      'payment', 'escrow', 'invoice', 'category', 'country', 'industry',
      'user', 'department', 'team', 'policy', 'document', 'certificate',
      'subscription', 'ai_session', 'automation_rule'
    ],
    required: true
  },
  entityId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  properties: mongoose.Schema.Types.Mixed,
  tags: [String],
  embedding: [Number],
  vectorized: { type: Boolean, default: false },
  lastVectorizedAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

knowledgeEntitySchema.index({ type: 1, entityId: 1 }, { unique: true });
knowledgeEntitySchema.index({ name: 'text', description: 'text' });
knowledgeEntitySchema.index({ tags: 1 });

export const KnowledgeEntity = mongoose.model('KnowledgeEntity', knowledgeEntitySchema);
