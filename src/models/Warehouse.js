import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  name: { en: String, ar: String },
  code: { type: String, required: true, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  address: { street: String, city: String, state: String, country: String, zip: String },
  capacity: { total: Number, used: Number, unit: { type: String, default: 'sqm' } },
  coordinates: { latitude: Number, longitude: Number },
  isActive: { type: Boolean, default: true },
  operatingHours: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

warehouseSchema.index({ vendor: 1 });
warehouseSchema.index({ manager: 1 });
warehouseSchema.index({ isActive: 1 });

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);

const countrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { en: String, ar: String },
  currency: { code: String, symbol: String, name: String },
  phoneCode: String,
  isActive: { type: Boolean, default: false },
  settings: {
    requiresVerification: { type: Boolean, default: true },
    taxRate: Number,
    defaultLanguage: { type: String, default: 'en' },
    deliveryEstimateDays: Number,
  },
  regions: [{ name: { en: String, ar: String }, code: String }],
  ports: [{ name: { en: String, ar: String }, code: String, type: { type: String, enum: ['sea', 'air', 'land'] } }],
  supportedPaymentMethods: [String],
  supportedShippingMethods: [String],
}, { timestamps: true });

countrySchema.index({ isActive: 1 });

export const Country = mongoose.models.Country || mongoose.model('Country', countrySchema);
