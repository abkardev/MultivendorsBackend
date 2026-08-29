import mongoose from 'mongoose';

const documentVersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  fileUrl: String,
  changes: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const procurementDocumentSchema = new mongoose.Schema({
  documentNumber: { type: String, unique: true },
  docType: {
    type: String,
    enum: ['quotation', 'proforma_invoice', 'commercial_invoice', 'packing_list', 'purchase_order', 'certificate_of_origin'],
    required: true,
  },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['draft', 'final', 'sent', 'acknowledged', 'amended', 'cancelled'],
    default: 'draft',
  },
  title: { en: String, ar: String },
  content: {
    header: mongoose.Schema.Types.Mixed,
    items: [mongoose.Schema.Types.Mixed],
    totals: mongoose.Schema.Types.Mixed,
    terms: String,
    notes: String,
  },
  versions: [documentVersionSchema],
  currentVersion: { type: Number, default: 1 },
  generatedAt: Date,
  sentAt: Date,
  acknowledgedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

procurementDocumentSchema.index({ buyer: 1, docType: 1 });
procurementDocumentSchema.index({ vendor: 1, docType: 1 });
procurementDocumentSchema.index({ quotation: 1 });
procurementDocumentSchema.index({ purchaseOrder: 1 });
procurementDocumentSchema.index({ status: 1, createdAt: -1 });
procurementDocumentSchema.index({ buyer: 1, status: 1 });

export const ProcurementDocument = mongoose.model('ProcurementDocument', procurementDocumentSchema);
