import mongoose from 'mongoose';

const savedFilterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 200 },
  filters: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['product', 'supplier', 'rfq', 'order'], default: 'product' },
}, { timestamps: true });

savedFilterSchema.index({ user: 1, type: 1 });
export default mongoose.model('SavedFilter', savedFilterSchema);
