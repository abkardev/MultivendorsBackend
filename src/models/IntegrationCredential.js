import mongoose from 'mongoose';

const integrationCredentialSchema = new mongoose.Schema({
  connection: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationConnection', required: true },
  type: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: String },
  expiresAt: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

integrationCredentialSchema.index({ connection: 1 });
integrationCredentialSchema.index({ key: 1 });

export const IntegrationCredential = mongoose.model('IntegrationCredential', integrationCredentialSchema);
