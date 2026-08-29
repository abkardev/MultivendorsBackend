import mongoose from 'mongoose';

const documentTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  content: mongoose.Schema.Types.Mixed,
  variables: [{
    name: String,
    label: String,
    type: String,
    required: { type: Boolean, default: false },
  }],
  outputFormat: {
    type: String,
    enum: ['pdf', 'docx', 'html'],
    default: 'pdf',
  },
  preview: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

documentTemplateSchema.index({ category: 1 });
documentTemplateSchema.index({ createdBy: 1 });
documentTemplateSchema.index({ name: 1 });

export const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);
