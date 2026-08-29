import mongoose from 'mongoose';

const variableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: String,
  required: { type: Boolean, default: false },
  default: mongoose.Schema.Types.Mixed
}, { _id: false });

const integrationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationProvider', required: true },
  category: String,
  config: { type: mongoose.Schema.Types.Mixed },
  variables: [variableSchema],
  documentation: String,
  isBuiltIn: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

integrationTemplateSchema.index({ provider: 1, category: 1 });
integrationTemplateSchema.index({ isBuiltIn: 1 });

export const IntegrationTemplate = mongoose.model('IntegrationTemplate', integrationTemplateSchema);
