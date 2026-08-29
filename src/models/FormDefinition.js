import mongoose from 'mongoose';

const formFieldSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'email', 'phone', 'date', 'select', 'multi_select', 'checkbox', 'radio', 'file', 'signature', 'section', 'heading'],
  },
  label: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  placeholder: {
    en: String,
    ar: String,
  },
  required: { type: Boolean, default: false },
  options: [{
    label: String,
    value: String,
  }],
  defaultValue: mongoose.Schema.Types.Mixed,
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    custom: String,
  },
  conditional: {
    fieldId: String,
    operator: String,
    value: String,
  },
  order: { type: Number, default: 0 },
  width: {
    type: String,
    enum: ['full', 'half', 'third'],
    default: 'full',
  },
  metadata: mongoose.Schema.Types.Mixed,
}, { _id: false });

const formDefinitionSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  description: {
    en: String,
    ar: String,
  },
  category: { type: String },
  tags: [String],
  fields: [formFieldSchema],
  settings: {
    submitButtonText: {
      en: { type: String, default: 'Submit' },
      ar: { type: String, default: 'إرسال' },
    },
    successMessage: {
      en: { type: String, default: 'Form submitted successfully' },
      ar: { type: String, default: 'تم إرسال النموذج بنجاح' },
    },
    redirectUrl: String,
    captcha: { type: Boolean, default: false },
    maxSubmissions: Number,
    requireAuth: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true } });

formDefinitionSchema.index({ status: 1, createdAt: -1 });
formDefinitionSchema.index({ createdBy: 1 });
formDefinitionSchema.index({ category: 1, status: 1 });
formDefinitionSchema.index({ tags: 1 });

export const FormDefinition = mongoose.model('FormDefinition', formDefinitionSchema);
