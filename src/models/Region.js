import mongoose from 'mongoose';

const regionSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  code: { type: String, unique: true, required: true },
  countries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Country' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

regionSchema.index({ code: 1 });
regionSchema.index({ isActive: 1 });

export const Region = mongoose.model('Region', regionSchema);
