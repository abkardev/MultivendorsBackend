import mongoose from 'mongoose';

const sellerCustomerSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String },
  position: { type: String },
  phone: { type: String },
  country: { type: String },
  industry: { type: String },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerTag' }],
  priority: { type: String, enum: ['low', 'medium', 'high', 'vip'], default: 'medium' },
  notes: { type: String },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  currency: { type: String, default: 'SAR' },
  lastOrderAt: Date,
  lastContactAt: Date,
  nextFollowUpAt: Date,
  healthScore: { type: Number, min: 0, max: 100, default: 50 },
  churnRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  lifetimeValue: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  repeatOrders: { type: Number, default: 0 },
  isFavorite: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

sellerCustomerSchema.index({ vendor: 1, buyer: 1 }, { unique: true });
sellerCustomerSchema.index({ vendor: 1, isFavorite: 1 });
sellerCustomerSchema.index({ vendor: 1, healthScore: -1 });
sellerCustomerSchema.index({ vendor: 1, lastContactAt: -1 });

export const SellerCustomer = mongoose.model('SellerCustomer', sellerCustomerSchema);
