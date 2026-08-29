import mongoose from 'mongoose';

const integrationProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'erp', 'crm', 'accounting', 'hr', 'document_management',
      'identity_provider', 'messaging', 'payment', 'cloud_storage',
      'internal_api', 'rest_api', 'soap', 'graphql', 'ftp_sftp', 'webhook'
    ],
    required: true
  },
  version: String,
  description: String,
  icon: String,
  configSchema: { type: mongoose.Schema.Types.Mixed },
  supportedAuthTypes: [{
    type: String,
    enum: ['oauth2', 'api_key', 'jwt', 'basic_auth', 'certificate']
  }],
  isActive: { type: Boolean, default: true },
  isBuiltIn: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

integrationProviderSchema.index({ type: 1, isActive: 1 });
integrationProviderSchema.index({ name: 1 }, { unique: true });

export const IntegrationProvider = mongoose.model('IntegrationProvider', integrationProviderSchema);
