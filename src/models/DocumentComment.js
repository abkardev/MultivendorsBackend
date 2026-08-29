import mongoose from 'mongoose';

const documentCommentSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  version: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

documentCommentSchema.index({ document: 1, createdAt: -1 });
documentCommentSchema.index({ version: 1 });
documentCommentSchema.index({ createdBy: 1 });
documentCommentSchema.index({ mentions: 1 });

export const DocumentComment = mongoose.model('DocumentComment', documentCommentSchema);
