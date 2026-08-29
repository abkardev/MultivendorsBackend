import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  group: {
    type: String,
    required: true,
    enum: ['products', 'orders', 'users', 'analytics', 'tenders', 'rfq', 'procurement', 'reviews', 'brands', 'categories', 'support', 'advertising', 'settings', 'documents', 'notifications', 'departments', 'roles', 'permissions'],
  },
  description: {
    en: String,
    ar: String,
  },
}, { timestamps: true });

permissionSchema.index({ group: 1 });

export const Permission = mongoose.model('Permission', permissionSchema);
