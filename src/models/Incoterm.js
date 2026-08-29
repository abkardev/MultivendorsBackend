import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String },
  description: { type: String },
  riskTransfer: { type: String },
  costBearing: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ code: 1 });
schema.index({ isActive: 1 });

export const Incoterm = mongoose.model('Incoterm', schema);
