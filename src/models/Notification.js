import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
      'rfq_received', 'rfq_response', 'rfq_closed',
      'tender_awarded', 'tender_bid', 'tender_closed',
      'message_received',
      'verification_approved', 'verification_rejected', 'verification_submitted',
      'payment_received', 'payment_released',
      'dispute_opened', 'dispute_resolved',
      'procurement_approved', 'procurement_rejected',
      'campaign_ended', 'subscription_expiring', 'subscription_activated',
      'system_announcement',
      'shipment_created', 'shipment_tracking_added', 'shipment_status_updated',
      'shipment_delivered', 'delivery_confirmed', 'delivery_delayed',
      'escrow_released', 'escrow_auto_released',
    ],
  },
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  body: {
    en: { type: String },
    ar: { type: String },
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'whatsapp'],
    default: ['in_app'],
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  isArchived: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  link: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  deliveryStatus: {
    in_app: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
    email: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
    whatsapp: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
  },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, isArchived: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
