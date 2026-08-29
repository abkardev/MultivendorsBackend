import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  group: {
    type: String,
    default: 'common',
    index: true,
  },
  en: { type: String, required: true },
  ar: String,
  fr: String,
  es: String,
  de: String,
  zh: String,
  ja: String,
  ko: String,
  tr: String,
  ur: String,
  hi: String,
  pt: String,
  ru: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

translationSchema.index({ group: 1, isActive: 1 });

export const Translation = mongoose.model('Translation', translationSchema);
