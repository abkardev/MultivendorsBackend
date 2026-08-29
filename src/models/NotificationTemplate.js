import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  type: { type: String, required: true },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'whatsapp', 'push', 'slack', 'webhook'],
  }],
  subject: {
    en: { type: String },
    ar: { type: String },
  },
  title: {
    en: { type: String },
    ar: { type: String },
  },
  body: {
    en: { type: String },
    ar: { type: String },
  },
  smsBody: {
    en: String,
    ar: String,
  },
  pushTitle: {
    en: String,
    ar: String,
  },
  pushBody: {
    en: String,
    ar: String,
  },
  emailHtml: {
    en: String,
    ar: String,
  },
  variables: [{
    name: String,
    type: { type: String, enum: ['string', 'number', 'date', 'url', 'object'] },
    required: { type: Boolean, default: false },
    description: String,
  }],
  defaultPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  category: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

notificationTemplateSchema.index({ type: 1 });
notificationTemplateSchema.index({ isActive: 1, category: 1 });

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
