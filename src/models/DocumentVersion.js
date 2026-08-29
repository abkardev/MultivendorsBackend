import mongoose from 'mongoose';

const documentVersionSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  versionNumber: { type: Number, required: true },
  file: {
    url: String,
    name: String,
    size: Number,
    mimeType: String,
  },
  changeLog: String,
  size: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, { timestamps: true, toJSON: { virtuals: true } });

documentVersionSchema.index({ document: 1, versionNumber: -1 });
documentVersionSchema.index({ document: 1, status: 1 });
documentVersionSchema.index({ createdBy: 1 });

export const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);
