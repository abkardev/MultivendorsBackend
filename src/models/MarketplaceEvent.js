import mongoose from 'mongoose';

const marketplaceEventSchema = new mongoose.Schema({
  // Event identification
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  version: { type: String, default: '1.0' },
  
  // Source
  source: { type: String, enum: ['order', 'rfq', 'shipment', 'escrow', 'payment', 'support', 'vendor', 'user', 'system', 'admin'], required: true },
  producer: { type: String, enum: ['api', 'webhook', 'cron', 'admin', 'system'], default: 'api' },
  
  // Entities
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  escrowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow' },
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  paymentId: { type: mongoose.Schema.Types.ObjectId },
  
  // Data
  data: { type: mongoose.Schema.Types.Mixed },
  previousState: { type: mongoose.Schema.Types.Mixed },
  
  // Metadata
  severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
  correlationId: { type: String },
  
  // Processing
  processed: { type: Boolean, default: false },
  processedAt: { type: Date },
  error: { type: String },
  
  // Retention
  ttl: { type: Date, index: { expireAfterSeconds: 0 } }, // Auto-delete after TTL
}, { timestamps: true });

// Indexes
marketplaceEventSchema.index({ eventType: 1, createdAt: -1 });
marketplaceEventSchema.index({ source: 1, createdAt: -1 });
marketplaceEventSchema.index({ userId: 1, createdAt: -1 });
marketplaceEventSchema.index({ orderId: 1 });
marketplaceEventSchema.index({ correlationId: 1 });
marketplaceEventSchema.index({ severity: 1, createdAt: -1 });
marketplaceEventSchema.index({ processed: 1, createdAt: -1 });

export default mongoose.model('MarketplaceEvent', marketplaceEventSchema);
