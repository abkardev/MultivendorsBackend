import mongoose from 'mongoose';

const customerTagSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' },
  description: String,
  customerCount: { type: Number, default: 0 },
}, { timestamps: true });

customerTagSchema.index({ vendor: 1, name: 1 }, { unique: true });

export const CustomerTag = mongoose.model('CustomerTag', customerTagSchema);
