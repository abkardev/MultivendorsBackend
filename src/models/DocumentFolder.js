import mongoose from 'mongoose';

const documentFolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentFolder' },
  color: String,
  icon: String,
  description: String,
  permissions: [{
    role: String,
    access: { type: String, enum: ['view', 'edit', 'approve', 'manage'] },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true, toJSON: { virtuals: true } });

documentFolderSchema.index({ parent: 1 });
documentFolderSchema.index({ createdBy: 1 });
documentFolderSchema.index({ name: 1 });

export const DocumentFolder = mongoose.model('DocumentFolder', documentFolderSchema);
