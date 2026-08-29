import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Who
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, enum: ['buyer', 'vendor', 'admin', 'super_admin'] },
  ip: { type: String },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  
  // What
  action: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'order', 'payment', 'escrow', 'wallet', 'user', 'vendor', 
      'product', 'shipment', 'dispute', 'auth', 'subscription',
      'admin', 'commission', 'system', 'withdrawal', 'refund'
    ],
    required: true 
  },
  
  // Entities affected
  entityType: { type: String },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  
  // Changes
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  
  // Financial audit fields
  amount: { type: Number },
  currency: { type: String, default: 'SAR' },
  referenceNumber: { type: String },
  correlationId: { type: String },
  ledgerEntryId: { type: String },
  
  // Metadata
  description: { type: String },
  status: { type: String, enum: ['success', 'failure', 'pending'], default: 'success' },
  
  // This log is IMMUTABLE
}, { timestamps: true });

// Indexes for efficient searching
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ referenceNumber: 1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, category: 1, createdAt: -1 });

// Prevent modifications
auditLogSchema.pre('findOneAndUpdate', () => { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('updateOne', () => { throw new Error('Audit logs are immutable'); });
auditLogSchema.pre('updateMany', () => { throw new Error('Audit logs are immutable'); });

export default mongoose.model('AuditLog', auditLogSchema);
