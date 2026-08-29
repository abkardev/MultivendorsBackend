import expressAsyncHandler from 'express-async-handler';
import { ProcurementDocument } from '../models/ProcurementDocument.js';
import { Quotation } from '../models/Quotation.js';
import { AppError } from '../middlewares/errorHandler.js';

function generateDocNumber(type) {
  const prefix = { quotation: 'Q', proforma_invoice: 'PI', commercial_invoice: 'CI', packing_list: 'PL', purchase_order: 'PO', certificate_of_origin: 'CO' }[type] || 'DOC';
  const now = new Date();
  const r = String(Math.floor(Math.random() * 90000) + 10000);
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${r}`;
}

// @desc Generate a document from quotation data
const generateDocument = expressAsyncHandler(async (req, res) => {
  const { quotationId, docType, title, terms, notes } = req.body;
  if (!quotationId || !docType) throw new AppError('quotationId and docType are required', 400);
  const quote = await Quotation.findById(quotationId).populate('buyer vendor');
  if (!quote) throw new AppError('Quotation not found', 404);
  const doc = await ProcurementDocument.create({
    documentNumber: generateDocNumber(docType),
    docType, quotation: quotationId, buyer: quote.buyer._id, vendor: quote.vendor._id,
    title: title || { en: `${docType.replace(/_/g, ' ')} - ${quote.quoteNumber}` },
    content: {
      header: { quoteNumber: quote.quoteNumber, date: new Date(), validUntil: quote.validUntil, incoterms: quote.incoterms, paymentTerms: quote.paymentTerms, currency: quote.currency },
      items: quote.items || [],
      totals: { subtotal: quote.subtotal, tax: quote.tax, shipping: quote.shipping, totalAmount: quote.totalAmount },
      terms: terms || quote.termsAndConditions,
      notes,
    },
    versions: [{ versionNumber: 1, generatedBy: req.user._id, changes: 'Initial generation' }],
    status: 'draft', generatedAt: new Date(), createdBy: req.user._id,
  });
  res.status(201).json({ status: true, data: doc });
});

// @desc Get documents
const getDocuments = expressAsyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'buyer') filter.buyer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;
  if (req.query.docType) filter.docType = req.query.docType;
  if (req.query.quotation) filter.quotation = req.query.quotation;
  const docs = await ProcurementDocument.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ status: true, data: docs });
});

// @desc Get single document
const getDocumentById = expressAsyncHandler(async (req, res) => {
  const doc = await ProcurementDocument.findById(req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  res.status(200).json({ status: true, data: doc });
});

// @desc Update document status
const updateDocumentStatus = expressAsyncHandler(async (req, res) => {
  const { status } = req.body;
  const doc = await ProcurementDocument.findById(req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  doc.status = status;
  if (status === 'sent') doc.sentAt = new Date();
  if (status === 'acknowledged') doc.acknowledgedAt = new Date();
  await doc.save();
  res.status(200).json({ status: true, data: doc });
});

// @desc Add version to document
const addDocumentVersion = expressAsyncHandler(async (req, res) => {
  const doc = await ProcurementDocument.findById(req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  const newVersion = { versionNumber: doc.currentVersion + 1, changes: req.body.changes || '', generatedBy: req.user._id };
  doc.versions.push(newVersion);
  doc.currentVersion += 1;
  if (req.body.fileUrl) doc.content = { ...doc.content, ...req.body.content };
  await doc.save();
  res.status(200).json({ status: true, data: doc });
});

export { generateDocument, getDocuments, getDocumentById, updateDocumentStatus, addDocumentVersion };
