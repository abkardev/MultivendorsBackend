import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  enabled: { type: Boolean, default: false },
  
  // Scope
  scope: { type: String, enum: ['global', 'country', 'subscription', 'environment'], default: 'global' },
  scopeValue: { type: String }, // e.g., 'SA', 'premium', 'production'
  
  // Targeting
  allowList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  denyList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  percentage: { type: Number, min: 0, max: 100, default: 100 },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Override for maintenance/testing
  forceEnabled: { type: Boolean },
  forceDisabled: { type: Boolean },
  
  // Audit
  changedAt: { type: Date },
  changeLog: [{ field: String, oldValue: mongoose.Schema.Types.Mixed, newValue: mongoose.Schema.Types.Mixed, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, changedAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

featureFlagSchema.index({ scope: 1, scopeValue: 1 });

export default mongoose.model('FeatureFlag', featureFlagSchema);
