import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['rfq', 'procurement', 'tender', 'document', 'message'],
    required: true,
  },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sharedAt: { type: Date, default: Date.now },
}, { _id: false });

const sharedProjectSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedWorkspace', required: true },
  name: { type: String, required: true },
  description: String,
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
  items: [itemSchema],
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active',
  },
}, { timestamps: true, toJSON: { virtuals: true } });

sharedProjectSchema.index({ workspace: 1 });
sharedProjectSchema.index({ status: 1 });
sharedProjectSchema.index({ 'items.type': 1, 'items.itemId': 1 });

export const SharedProject = mongoose.model('SharedProject', sharedProjectSchema);
