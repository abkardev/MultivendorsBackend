import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release', required: true },
  locale: { type: String, default: 'en' },
  title: { type: String, required: true },
  content: { type: String },
  sections: [{
    heading: { type: String },
    content: { type: String },
    type: { type: String },
    icon: { type: String },
  }],
  tags: [{ type: String }],
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ release: 1, locale: 1 }, { unique: true });
schema.index({ release: 1 });
schema.index({ locale: 1 });
schema.index({ isPublished: 1 });

export const ReleaseNote = mongoose.model('ReleaseNote', schema);
