import mongoose from 'mongoose';

const prItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: String,
  estimatedPrice: Number,
  category: String,
  requiredDate: Date,
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comment: String,
  date: { type: Date, default: Date.now },
}, { _id: false });

const procurementRequestSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  department: String,
  items: [prItemSchema],
  estimatedBudget: Number,
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'ordered', 'received', 'cancelled'],
    default: 'draft',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  approvals: [approvalSchema],
  notes: String,
}, { timestamps: true });

const poItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: String,
  unitPrice: { type: Number, required: true },
  totalPrice: Number,
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  procurementRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcurementRequest' },
  poNumber: { type: String, required: true },
  title: { type: String, required: true },
  items: [poItemSchema],
  subtotal: Number,
  tax: Number,
  shipping: Number,
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'draft',
  },
  paymentTerms: String,
  deliveryAddress: String,
  expectedDelivery: Date,
  notes: String,
}, { timestamps: true });

purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ buyer: 1, status: 1 });
purchaseOrderSchema.index({ vendor: 1, status: 1 });
purchaseOrderSchema.index({ vendor: 1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });
purchaseOrderSchema.index({ procurementRequest: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

procurementRequestSchema.index({ buyer: 1 });
procurementRequestSchema.index({ status: 1, createdAt: -1 });
procurementRequestSchema.index({ buyer: 1, status: 1 });

export const ProcurementRequest = mongoose.model('ProcurementRequest', procurementRequestSchema);
export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
