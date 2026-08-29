import mongoose from 'mongoose';

const syncConflictSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  localVersion: { type: mongoose.Schema.Types.Mixed },
  serverVersion: { type: mongoose.Schema.Types.Mixed },
  localData: { type: mongoose.Schema.Types.Mixed },
  serverData: { type: mongoose.Schema.Types.Mixed },
  resolution: { type: String, enum: ['pending', 'resolved_local', 'resolved_server', 'resolved_manual', 'ignored'], default: 'pending' },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

syncConflictSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });
syncConflictSchema.index({ resolution: 1 });
syncConflictSchema.index({ entityType: 1, entityId: 1 });

const SyncConflict = mongoose.model('SyncConflict', syncConflictSchema);
export default SyncConflict;
