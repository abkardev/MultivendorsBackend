import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  role: String,
  access: { type: String, enum: ['view', 'edit', 'approve', 'manage'] },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentFolder' },
  tags: [String],
  file: {
    url: String,
    name: String,
    size: Number,
    mimeType: String,
    pages: Number,
  },
  type: {
    type: String,
    enum: ['pdf', 'doc', 'spreadsheet', 'image', 'other'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft',
  },
  version: { type: Number, default: 1 },
  permissions: [permissionSchema],
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  retentionDate: Date,
  archiveDate: Date,
}, { timestamps: true, toJSON: { virtuals: true } });

documentSchema.index({ folder: 1 });
documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ type: 1, status: 1 });

export const Document = mongoose.model('Document', documentSchema);
