import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { en: { type: String, required: true }, ar: { type: String } },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
});

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String },
  note: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const shipmentDocumentSchema = new mongoose.Schema({
  docType: {
    type: String, required: true,
    enum: ['packing_list', 'commercial_invoice', 'proforma_invoice',
      'bill_of_lading', 'air_waybill', 'delivery_note',
      'certificate_of_origin', 'customs_document', 'inspection_certificate'],
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String },
  fileSize: { type: Number },
  version: { type: Number, default: 1 },
  uploadedAt: { type: Date, default: Date.now },
});

const timelineEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  description: { type: String },
});

const packageSchema = new mongoose.Schema({
  packageNumber: { type: Number, required: true },
  weight: { type: Number },
  weightUnit: { type: String, default: 'kg' },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: 'cm' },
  },
  quantity: { type: Number },
  description: { type: String },
  barcode: { type: String },
});

const shippingNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

const internalNoteEditSchema = new mongoose.Schema({
  text: { type: String, required: true },
  editedAt: { type: Date, default: Date.now },
});

const internalNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  editHistory: [internalNoteEditSchema],
});

const appointmentHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['requested', 'accepted', 'suggested', 'rejected'], required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
  by: { type: String },
});

const deliveryAppointmentSchema = new mongoose.Schema({
  requestedDate: { type: Date },
  requestedTimeSlot: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'suggested', 'rejected'], default: 'pending' },
  vendorSuggestedDate: { type: Date },
  vendorSuggestedTimeSlot: { type: String },
  vendorResponseNote: { type: String },
  respondedAt: { type: Date },
  history: [appointmentHistorySchema],
});

const delayReasonSchema = new mongoose.Schema({
  reason: {
    type: String,
    enum: ['customs_clearance', 'weather_conditions', 'port_congestion',
      'shipping_company_delay', 'supplier_delay', 'buyer_request',
      'documentation_issues', 'other'],
  },
  customComment: { type: String },
  delayedAt: { type: Date, default: Date.now },
});

const shipmentPhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  photoType: {
    type: String,
    enum: ['product', 'packaging', 'container_loading', 'truck_loading', 'delivery_evidence'],
    default: 'product',
  },
  description: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const shippingLabelSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const productionTimelineSchema = new mongoose.Schema({
  startDate: { type: Date },
  estimatedCompletionDate: { type: Date },
  actualCompletionDate: { type: Date },
});

const shippingDetailsSchema = new mongoose.Schema({
  carrier: { type: String },
  trackingNumber: { type: String },
  trackingUrl: { type: String },
  shipmentRefNumber: { type: String },
  shippingMethod: { type: String },
  shippingCost: { type: Number },
  shippedAt: { type: Date },
  estimatedShippingDate: { type: Date },
  actualShippingDate: { type: Date },
  estimatedDelivery: { type: Date },
  actualDeliveryDate: { type: Date },
  deliveredAt: { type: Date },
});

const partialShipmentSchema = new mongoose.Schema({
  shipmentNumber: { type: Number, required: true },
  quantity: { type: Number },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { en: { type: String }, ar: { type: String } },
    quantity: { type: Number },
  }],
  shippingDetails: shippingDetailsSchema,
  shipmentStatus: {
    type: String,
    enum: ['pending', 'preparing', 'packed', 'ready_for_pickup',
      'shipped', 'in_transit', 'customs_clearance', 'out_for_delivery',
      'delivered', 'delivery_confirmed', 'cancelled'],
    default: 'pending',
  },
  trackingHistory: [trackingEventSchema],
  timeline: [timelineEventSchema],
  documents: [shipmentDocumentSchema],
  packages: [packageSchema],
  shippingNotes: [shippingNoteSchema],
  internalNotes: [internalNoteSchema],
  deliveryAppointment: deliveryAppointmentSchema,
  delayReason: delayReasonSchema,
  photos: [shipmentPhotoSchema],
  labels: [shippingLabelSchema],
  productionTimeline: productionTimelineSchema,
  deliveryConfirmedAt: { type: Date },
  deliveryConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const escrowOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['USD', 'SAR', 'EUR'], default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'awaiting_payment', 'in_escrow', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['credit_card', 'bank_transfer', 'paypal'] },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    // Single-shipment fields (backward compatible)
    shippingDetails: shippingDetailsSchema,
    trackingHistory: [trackingEventSchema],
    shipmentDocuments: [shipmentDocumentSchema],
    timeline: [timelineEventSchema],
    shipmentStatus: {
      type: String,
      enum: ['pending', 'preparing', 'packed', 'ready_for_pickup', 'shipped', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'delivery_confirmed', 'cancelled'],
      default: 'pending',
    },
    deliveryConfirmedAt: { type: Date },
    deliveryConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryIssue: { reported: { type: Boolean, default: false }, reason: { type: String }, description: { type: String }, reportedAt: { type: Date } },
    escrowReleasedAt: { type: Date },
    autoReleaseDate: { type: Date },
    notes: { type: String },

    // Phase 4.4.1: Shipping Instructions
    shippingInstructions: { type: String },

    // Phase 4.4.1: Production Timeline
    productionTimeline: productionTimelineSchema,

    // Phase 4.4.1: Partial Shipments
    partialShipments: [partialShipmentSchema],

    // Phase 4.4.1: Shipping Notes (public)
    shippingNotes: [shippingNoteSchema],

    // Phase 4.4.1: Internal Notes (private - NOT visible to buyer)
    internalNotes: [internalNoteSchema],

    // Phase 4.4.1: Delivery Appointment
    deliveryAppointment: deliveryAppointmentSchema,

    // Phase 4.4.1: Delay Reason
    delayReason: delayReasonSchema,

    // Phase 4.4.1: Shipment Photos
    shipmentPhotos: [shipmentPhotoSchema],

    // Phase 4.4.1: Packages (for single-shipment mode)
    shipmentPackages: [packageSchema],

    // Phase 4.4.1: Shipping Labels
    shippingLabels: [shippingLabelSchema],
  },
  { timestamps: true }
);

// Indexes for dashboard query performance
escrowOrderSchema.index({ buyer: 1, status: 1 });
escrowOrderSchema.index({ vendor: 1, status: 1 });
escrowOrderSchema.index({ shipmentStatus: 1 });
escrowOrderSchema.index({ autoReleaseDate: 1 }, { sparse: true });
escrowOrderSchema.index({ buyer: 1, createdAt: -1 });
escrowOrderSchema.index({ vendor: 1, createdAt: -1 });
escrowOrderSchema.index({ buyer: 1, shipmentStatus: 1 });
escrowOrderSchema.index({ vendor: 1, shipmentStatus: 1 });
escrowOrderSchema.index({ status: 1, createdAt: -1 });
escrowOrderSchema.index({ createdAt: -1 });
escrowOrderSchema.index({ paymentId: 1 });

escrowOrderSchema.pre('validate', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('EscrowOrder').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const EscrowOrder = mongoose.model('EscrowOrder', escrowOrderSchema);
export default EscrowOrder;
