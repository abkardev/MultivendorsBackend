import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 200 },
  query: { type: String },
  filters: { type: mongoose.Schema.Types.Mixed },
  sort: { type: String, default: 'createdAt' },
  direction: { type: String, enum: ['asc', 'desc'], default: 'desc' },
  category: String,
  industry: String,
  country: String,
  notifyNewResults: { type: Boolean, default: false },
  lastNotifiedAt: Date,
}, { timestamps: true });

savedSearchSchema.index({ user: 1, updatedAt: -1 });
export default mongoose.model('SavedSearch', savedSearchSchema);
