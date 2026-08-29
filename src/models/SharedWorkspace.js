import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
}, { _id: false });

const collectionItemSchema = new mongoose.Schema({
  type: { type: String },
  itemId: { type: mongoose.Schema.Types.ObjectId },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const sharedWorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
  members: [memberSchema],
  settings: {
    allowExternalInvites: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
  },
  collections: [collectionItemSchema],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, { timestamps: true, toJSON: { virtuals: true } });

sharedWorkspaceSchema.index({ status: 1 });
sharedWorkspaceSchema.index({ 'members.user': 1 });
sharedWorkspaceSchema.index({ organizations: 1 });

export const SharedWorkspace = mongoose.model('SharedWorkspace', sharedWorkspaceSchema);
