import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  code: { type: String, unique: true, required: true },
  description: {
    en: String,
    ar: String
  },
  issuingBody: String,
  requirements: [String],
  validityPeriod: { type: Number },
  badge: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true } });

certificationSchema.index({ code: 1 });
certificationSchema.index({ isActive: 1 });

export const Certification = mongoose.model('Certification', certificationSchema);
