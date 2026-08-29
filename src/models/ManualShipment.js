import mongoose from 'mongoose';

const manualShipmentSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  carrierName: { type: String, trim: true },
  trackingNumber: { type: String, trim: true },
  shippingMethod: { type: String, enum: ['air', 'sea', 'land', 'courier', 'other'], default: 'courier' },
  estimatedDeliveryDate: Date,
  actualShippedDate: Date,
  deliveredDate: Date,
  status: {
    type: String,
    enum: ['pending', 'shipped', 'in_transit', 'delivered', 'delayed', 'cancelled'],
    default: 'pending',
  },
  statusUpdates: [{
    status: String,
    note: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  notes: String,
  documents: [{
    type: { type: String, enum: ['packing_list', 'commercial_invoice', 'bill_of_lading', 'airway_bill', 'proof_of_delivery', 'other'] },
    name: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  isConfirmed: { type: Boolean, default: false },
  confirmedAt: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

manualShipmentSchema.index({ vendor: 1, order: 1 }, { unique: true });
manualShipmentSchema.index({ vendor: 1, status: 1 });
manualShipmentSchema.index({ buyer: 1, status: 1 });
manualShipmentSchema.index({ order: 1 });

export const ManualShipment = mongoose.model('ManualShipment', manualShipmentSchema);
