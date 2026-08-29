import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['keyword', 'domain', 'email', 'phone', 'ip', 'image_pattern'],
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    default: ''
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

schema.index({ type: 1, value: 1 }, { unique: true });
schema.index({ isActive: 1, type: 1 });

export const BlockedContent = mongoose.model('BlockedContent', schema);
