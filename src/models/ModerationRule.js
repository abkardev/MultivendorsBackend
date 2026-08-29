import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['keyword', 'profanity', 'spam', 'duplicate', 'image', 'domain', 'pattern', 'ai'],
    required: true
  },
  entityTypes: [String],
  pattern: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    enum: ['flag', 'block', 'review', 'approve', 'notify'],
    default: 'flag'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoModerate: {
    type: Boolean,
    default: false
  },
  aiAssisted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

schema.index({ type: 1, isActive: 1 });
schema.index({ entityTypes: 1 });
schema.index({ isActive: 1, autoModerate: 1 });

export const ModerationRule = mongoose.model('ModerationRule', schema);
