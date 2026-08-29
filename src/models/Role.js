import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  description: {
    en: String,
    ar: String,
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
  }],
  isSystem: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

roleSchema.index({ isSystem: 1 });

export const Role = mongoose.model('Role', roleSchema);
