import mongoose from 'mongoose';

const comparisonSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['product', 'supplier'], required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'itemModel' }],
  itemModel: { type: String, enum: ['Product', 'Vendor'] },
  name: { type: String, maxlength: 200 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

comparisonSchema.index({ user: 1, updatedAt: -1 });
export default mongoose.model('Comparison', comparisonSchema);
