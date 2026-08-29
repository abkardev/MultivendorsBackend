import express from 'express';
import {
  createShipment, updateShipmentStatus, updateTrackingInfo,
  uploadDocument, deleteDocument,
  confirmDelivery, reportDeliveryIssue,
  setShippingInstructions,
  updateProductionTimeline,
  addShippingNote, updateShippingNote, deleteShippingNote,
  addInternalNote, updateInternalNote, deleteInternalNote,
  requestDeliveryAppointment, respondToAppointment,
  uploadShipmentPhoto, deleteShipmentPhoto,
  uploadShippingLabel, deleteShippingLabel,
  createPartialShipment, updatePartialShipmentStatus, updatePartialShipmentTracking,
  addPackage, removePackage,
  getShipment, getShipmentTimeline, getPartialShipments, getInternalNotes,
  getBuyerShipments, getVendorShipments, getAdminShipments,
  getShipmentAnalytics,
} from '../controllers/shipmentController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { createUploadMiddleware, UPLOAD_CATEGORIES } from '../middlewares/uploadMiddleware.js';

const router = express.Router();
const photoUpload = createUploadMiddleware(UPLOAD_CATEGORIES.PRODUCT_IMAGE);
const labelUpload = createUploadMiddleware(UPLOAD_CATEGORIES.SHIPMENT_DOC);
const docUpload = createUploadMiddleware(UPLOAD_CATEGORIES.SHIPMENT_DOC);

// ─── Single Shipment Workflow ────────────────────────────
router.post('/shipments/create', protect, authorize('vendor', 'admin'), audit('create', 'shipment', (req) => `Shipment created for order ${req.body.orderId}`), createShipment);
router.put('/shipments/:orderId/status', protect, authorize('vendor', 'admin'), audit('update', 'shipment', (req) => `Shipment ${req.params.orderId} status updated`), updateShipmentStatus);
router.put('/shipments/:orderId/tracking', protect, authorize('vendor', 'admin'), updateTrackingInfo);

// ─── Shipping Instructions ───────────────────────────────
router.put('/shipments/:orderId/instructions', protect, authorize('user', 'admin'), setShippingInstructions);

// ─── Production Timeline ─────────────────────────────────
router.put('/shipments/:orderId/production', protect, authorize('vendor', 'admin'), updateProductionTimeline);

// ─── Shipping Notes (public) ─────────────────────────────
router.post('/shipments/:orderId/notes', protect, authorize('vendor', 'admin'), addShippingNote);
router.put('/shipments/:orderId/notes/:noteId', protect, authorize('vendor', 'admin'), updateShippingNote);
router.delete('/shipments/:orderId/notes/:noteId', protect, authorize('vendor', 'admin'), deleteShippingNote);

// ─── Internal Notes (private) ────────────────────────────
router.post('/shipments/:orderId/internal-notes', protect, authorize('vendor', 'admin'), addInternalNote);
router.put('/shipments/:orderId/internal-notes/:noteId', protect, authorize('vendor', 'admin'), updateInternalNote);
router.delete('/shipments/:orderId/internal-notes/:noteId', protect, authorize('vendor', 'admin'), deleteInternalNote);
router.get('/shipments/:orderId/internal-notes', protect, authorize('vendor', 'admin'), getInternalNotes);

// ─── Delivery Appointment ────────────────────────────────
router.post('/shipments/:orderId/appointment', protect, authorize('user', 'admin'), requestDeliveryAppointment);
router.put('/shipments/:orderId/appointment/respond', protect, authorize('vendor', 'admin'), respondToAppointment);

// ─── Shipment Photos ─────────────────────────────────────
router.post('/shipments/:orderId/photos', protect, authorize('vendor', 'admin'), photoUpload.single('file'), uploadShipmentPhoto);
router.delete('/shipments/:orderId/photos/:photoId', protect, authorize('vendor', 'admin'), deleteShipmentPhoto);

// ─── Shipping Labels ─────────────────────────────────────
router.post('/shipments/:orderId/labels', protect, authorize('vendor', 'admin'), labelUpload.single('file'), uploadShippingLabel);
router.delete('/shipments/:orderId/labels/:labelId', protect, authorize('vendor', 'admin'), deleteShippingLabel);

// ─── Partial Shipments ───────────────────────────────────
router.post('/shipments/:orderId/partial', protect, authorize('vendor', 'admin'), createPartialShipment);
router.put('/shipments/:orderId/partial/:shipmentNumber/status', protect, authorize('vendor', 'admin'), updatePartialShipmentStatus);
router.put('/shipments/:orderId/partial/:shipmentNumber/tracking', protect, authorize('vendor', 'admin'), updatePartialShipmentTracking);
router.get('/shipments/:orderId/partial', protect, getPartialShipments);

// ─── Packages ────────────────────────────────────────────
router.post('/shipments/:orderId/packages', protect, authorize('vendor', 'admin'), addPackage);
router.delete('/shipments/:orderId/packages/:packageId', protect, authorize('vendor', 'admin'), removePackage);

// ─── Documents ───────────────────────────────────────────
router.post('/shipments/:orderId/documents', protect, authorize('vendor', 'admin'), docUpload.single('file'), uploadDocument);
router.delete('/shipments/:orderId/documents/:documentId', protect, authorize('vendor', 'admin'), deleteDocument);

// ─── Delivery Confirmation ───────────────────────────────
router.post('/shipments/confirm-delivery', protect, authorize('user', 'admin'), audit('update', 'delivery_confirmation', (req) => `Delivery confirmed for order ${req.body.orderId}`), confirmDelivery);
router.post('/shipments/report-issue', protect, authorize('user', 'admin'), reportDeliveryIssue);

// ─── Dashboards ──────────────────────────────────────────
router.get('/shipments/buyer', protect, authorize('user', 'admin'), getBuyerShipments);
router.get('/shipments/vendor', protect, authorize('vendor', 'admin'), getVendorShipments);
router.get('/shipments/admin', protect, authorize('admin'), getAdminShipments);

// ─── Analytics ───────────────────────────────────────────
router.get('/shipments/analytics', protect, authorize('vendor', 'admin'), getShipmentAnalytics);

// ─── Queries ─────────────────────────────────────────────
router.get('/shipments/:orderId', protect, getShipment);
router.get('/shipments/:orderId/timeline', protect, getShipmentTimeline);

export default router;
