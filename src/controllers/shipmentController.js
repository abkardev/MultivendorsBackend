import EscrowOrder from '../models/Order.js';
import { Vendor } from '../models/vendorModel.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { notificationService } from '../services/notificationService.js';
import { createAuditLog } from '../middlewares/auditMiddleware.js';

const getOrCreateWallet = async (userId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, currency });
  return wallet;
};

const logTransaction = async ({ wallet, user, type, amount, currency, reference, description }) => {
  const balance = type === 'escrow_hold' ? wallet.pendingBalance : wallet.availableBalance;
  return Transaction.create({ wallet: wallet._id, user, type, amount, currency, balance, reference, description });
};

const VALID_TRANSITIONS = {
  pending: ['preparing'],
  preparing: ['packed', 'cancelled'],
  packed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'delivered', 'cancelled'],
  in_transit: ['customs_clearance', 'out_for_delivery', 'delivered', 'cancelled'],
  customs_clearance: ['in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['delivery_confirmed'],
  delivery_confirmed: [],
  cancelled: [],
};

const DELAY_REASONS = ['customs_clearance', 'weather_conditions', 'port_congestion', 'shipping_company_delay', 'supplier_delay', 'buyer_request', 'documentation_issues', 'other'];

const NOTIFICATION_TYPE_MAP = {
  shipped: 'shipment_created',
  tracking_added: 'shipment_tracking_added',
  status_update: 'shipment_status_updated',
  delivered: 'shipment_delivered',
  delivery_confirmed: 'delivery_confirmed',
  delayed: 'delivery_delayed',
  escrow_released: 'escrow_released',
};

async function addTimelineEvent(order, event, description) {
  order.timeline.push({ event, timestamp: new Date(), description });
}

async function trackChange(order, status, location, note) {
  order.trackingHistory.push({ status, location, note, timestamp: new Date() });
}

async function sendShipmentNotification(order, typeKey, buyerTitle, buyerBody, vendorTitle, vendorBody, link) {
  const notifType = NOTIFICATION_TYPE_MAP[typeKey] || 'shipment_status_updated';
  await notificationService.send({
    recipient: order.buyer, type: notifType,
    title: buyerTitle, body: buyerBody,
    data: { orderId: order._id, orderNumber: order.orderNumber, shipmentStatus: order.shipmentStatus },
    channels: ['in_app', 'email'], link,
  });
  const vendorDoc = await Vendor.findById(order.vendor);
  if (vendorDoc) {
    await notificationService.send({
      recipient: vendorDoc.user, type: notifType,
      title: vendorTitle, body: vendorBody,
      data: { orderId: order._id, orderNumber: order.orderNumber, shipmentStatus: order.shipmentStatus },
      channels: ['in_app', 'email'], link,
    });
  }
}

async function releaseEscrowFunds(order) {
  const vendorDoc = await Vendor.findById(order.vendor);
  if (!vendorDoc) throw new Error('Vendor not found');
  const sellerWallet = await getOrCreateWallet(vendorDoc.user, order.currency);
  sellerWallet.pendingBalance = Math.max(0, sellerWallet.pendingBalance - order.totalAmount);
  sellerWallet.availableBalance += order.totalAmount;
  await sellerWallet.save();
  await logTransaction({
    wallet: sellerWallet, user: vendorDoc.user, type: 'escrow_release',
    amount: order.totalAmount, currency: order.currency,
    reference: order._id.toString(),
    description: `Escrow released for order ${order.orderNumber}`,
  });
  order.status = 'completed';
  order.escrowReleasedAt = new Date();
}

function isVendorOfOrder(order, userId) {
  return String(order.vendor) === String(userId) || String(order.vendor?._id) === String(userId);
}

function isBuyerOfOrder(order, userId) {
  return String(order.buyer) === String(userId) || String(order.buyer?._id) === String(userId);
}

// ─── HELPER: check status transition includes delay ──────
function requiresDelayReason(newStatus) {
  return ['delayed'].includes(newStatus);
}

// ─── CORE SHIPMENT WORKFLOW ──────────────────────────────

export const createShipment = async (req, res) => {
  try {
    const { orderId, shippingCompany, trackingNumber, trackingUrl, shipmentRefNumber,
      shippingMethod, shippingCost, estimatedShippingDate, estimatedDeliveryDate } = req.body;

    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }
    if (!['in_escrow', 'shipped'].includes(order.status)) {
      return res.status(400).json({ status: false, message: 'Order must be in escrow to create shipment' });
    }

    order.shippingDetails = {
      carrier: shippingCompany,
      trackingNumber, trackingUrl, shipmentRefNumber,
      shippingMethod, shippingCost: shippingCost ? Number(shippingCost) : undefined,
      estimatedShippingDate: estimatedShippingDate ? new Date(estimatedShippingDate) : undefined,
      estimatedDelivery: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
      shippedAt: new Date(),
    };
    order.shipmentStatus = 'shipped';
    order.status = 'shipped';

    await trackChange(order, 'shipped', '', `Shipment created with ${shippingCompany}`);
    await addTimelineEvent(order, 'Shipped', `Order shipped via ${shippingCompany}`);
    await order.save();

    await sendShipmentNotification(order, 'shipped',
      { en: 'Order Shipped', ar: 'تم شحن الطلب' },
      { en: `Your order #${order.orderNumber} has been shipped via ${shippingCompany}`, ar: `تم شحن طلبك #${order.orderNumber} عبر ${shippingCompany}` },
      { en: 'Shipment Created', ar: 'تم إنشاء الشحنة' },
      { en: `Shipment created for order #${order.orderNumber}`, ar: `تم إنشاء شحنة للطلب #${order.orderNumber}` },
      `/orders/${orderId}/tracking`
    );
    await createAuditLog({ action: 'create', resource: 'shipment', resourceId: order._id,
      description: `Shipment created for order ${order.orderNumber}`, performedBy: req.user._id,
      performedByRole: 'vendor', performedByName: req.user.name, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ status: true, data: order });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateShipmentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, note, delayReason, delayComment } = req.body;

    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }

    const allowed = VALID_TRANSITIONS[order.shipmentStatus];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        status: false,
        message: `Cannot transition from ${order.shipmentStatus} to ${status}`,
      });
    }

    // Require delay reason if transitioning to a status that indicates delay
    const isDelayed = status !== 'delivery_confirmed' && order.shipmentStatus !== 'pending' &&
      ['customs_clearance'].includes(status) && !['customs_clearance'].includes(order.shipmentStatus);

    if (isDelayed && !delayReason) {
      return res.status(400).json({ status: false, message: 'Delay reason is required for this status transition' });
    }

    const previousStatus = order.shipmentStatus;
    order.shipmentStatus = status;

    if (status === 'shipped' && !order.shippingDetails.shippedAt) {
      order.shippingDetails.shippedAt = new Date();
    }
    if (status === 'delivered') {
      order.shippingDetails.deliveredAt = new Date();
      order.shippingDetails.actualDeliveryDate = new Date();
      order.status = 'delivered';
    }
    if (status === 'cancelled') {
      order.status = 'pending';
    }

    // Store delay reason if provided
    if (delayReason && DELAY_REASONS.includes(delayReason)) {
      order.delayReason = { reason: delayReason, customComment: delayComment || '', delayedAt: new Date() };
      await sendShipmentNotification(order, 'delayed',
        { en: 'Shipment Delayed', ar: 'تأخر الشحنة' },
        { en: `Order #${order.orderNumber} is delayed due to: ${delayReason.replace(/_/g, ' ')}`, ar: `الطلب #${order.orderNumber} متأخر بسبب: ${delayReason.replace(/_/g, ' ')}` },
        { en: 'Shipment Delayed', ar: 'تأخر الشحنة' },
        { en: `Order #${order.orderNumber} marked as delayed`, ar: `تم وضع الطلب #${order.orderNumber} كمتأخر` },
        `/orders/${orderId}/tracking`
      );
    }

    await trackChange(order, status, location || '', note || `Status updated to ${status}`);
    await addTimelineEvent(order,
      status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      delayReason ? `Delayed: ${delayReason.replace(/_/g, ' ')}. ${delayComment || ''}` : (note || ''));
    await order.save();

    const notificationKey = status === 'delivered' ? 'delivered' : 'status_update';
    await sendShipmentNotification(order, notificationKey,
      { en: 'Shipment Updated', ar: 'تم تحديث الشحنة' },
      { en: `Order #${order.orderNumber} is now: ${status.replace(/_/g, ' ')}`, ar: `الطلب #${order.orderNumber} الآن: ${status.replace(/_/g, ' ')}` },
      { en: 'Shipment Status Updated', ar: 'تم تحديث حالة الشحنة' },
      { en: `Order #${order.orderNumber} status: ${previousStatus} → ${status}`, ar: `حالة الطلب #${order.orderNumber}: ${previousStatus} → ${status}` },
      `/orders/${orderId}/tracking`
    );

    if (status === 'cancelled') {
      await createAuditLog({ action: 'update', resource: 'shipment', resourceId: order._id,
        description: `Shipment cancelled for order ${order.orderNumber}`, performedBy: req.user._id,
        performedByRole: 'vendor', performedByName: req.user.name, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    }

    res.json({ status: true, data: order });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTrackingInfo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, trackingUrl, carrier, estimatedDelivery } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });

    if (!order.shippingDetails) order.shippingDetails = {};
    if (trackingNumber) order.shippingDetails.trackingNumber = trackingNumber;
    if (trackingUrl) order.shippingDetails.trackingUrl = trackingUrl;
    if (carrier) order.shippingDetails.carrier = carrier;
    if (estimatedDelivery) order.shippingDetails.estimatedDelivery = new Date(estimatedDelivery);
    await trackChange(order, 'tracking_updated', '', 'Tracking information updated');
    await order.save();
    await sendShipmentNotification(order, 'tracking_added',
      { en: 'Tracking Number Added', ar: 'تم إضافة رقم التتبع' },
      { en: `Tracking #${trackingNumber} added to order #${order.orderNumber}`, ar: `تم إضافة رقم التتبع #${trackingNumber} للطلب #${order.orderNumber}` },
      { en: 'Tracking Updated', ar: 'تم تحديث التتبع' },
      { en: `Tracking info updated for order #${order.orderNumber}`, ar: `تم تحديث معلومات التتبع للطلب #${order.orderNumber}` },
      `/orders/${orderId}/tracking`);
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── SHIPMENT DOCUMENTS (single-shipment) ────────────────

export const uploadDocument = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { docType } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });
    const existing = order.shipmentDocuments.filter(d => d.docType === docType);
    order.shipmentDocuments.push({ docType, fileUrl: req.file.path || `/uploads/${req.file.filename}`, fileName: req.file.originalname, mimeType: req.file.mimetype, fileSize: req.file.size, version: existing.length + 1 });
    await order.save();
    await createAuditLog({ action: 'upload', resource: 'shipment_document', resourceId: order._id, description: `Document ${docType} uploaded for order ${order.orderNumber}`, performedBy: req.user._id, performedByRole: 'vendor', performedByName: req.user.name, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ status: true, data: order.shipmentDocuments });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteDocument = async (req, res) => {
  try {
    const { orderId, documentId } = req.params;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    order.shipmentDocuments.pull({ _id: documentId });
    await order.save();
    res.json({ status: true, data: order.shipmentDocuments });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── DELIVERY CONFIRMATION ───────────────────────────────

export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (!isBuyerOfOrder(order, req.user._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!['shipped', 'delivered'].includes(order.status)) return res.status(400).json({ status: false, message: 'Cannot confirm delivery in current status' });

    order.shipmentStatus = 'delivery_confirmed';
    order.deliveryConfirmedAt = new Date();
    order.deliveryConfirmedBy = req.user._id;
    order.shippingDetails.deliveredAt = new Date();
    order.shippingDetails.actualDeliveryDate = new Date();
    order.status = 'delivered';
    await trackChange(order, 'delivery_confirmed', '', 'Buyer confirmed delivery');
    await addTimelineEvent(order, 'Delivery Confirmed', 'Buyer confirmed receipt of goods');
    await releaseEscrowFunds(order);
    await order.save();
    await addTimelineEvent(order, 'Escrow Released', 'Funds released to vendor');
    await sendShipmentNotification(order, 'delivery_confirmed',
      { en: 'Delivery Confirmed', ar: 'تم تأكيد التسليم' },
      { en: `You confirmed delivery for order #${order.orderNumber}. Funds released.`, ar: `لقد أكدت تسليم الطلب #${order.orderNumber}. تم تحرير الأموال.` },
      { en: 'Delivery Confirmed by Buyer', ar: 'تم تأكيد التسليم من قبل المشتري' },
      { en: `Buyer confirmed delivery for order #${order.orderNumber}. Funds released.`, ar: `أكد المشتري تسليم الطلب #${order.orderNumber}. تم تحرير الأموال.` },
      `/orders/${orderId}`);
    await notificationService.send({ recipient: order.buyer, type: 'escrow_released',
      title: { en: 'Escrow Released', ar: 'تم تحرير الضمان' },
      body: { en: `Funds for order #${order.orderNumber} have been released to the vendor.`, ar: `تم تحرير أموال الطلب #${order.orderNumber} للبائع.` },
      data: { orderId: order._id, orderNumber: order.orderNumber }, channels: ['in_app', 'email'], link: `/orders/${orderId}` });
    await createAuditLog({ action: 'update', resource: 'delivery_confirmation', resourceId: order._id,
      description: `Delivery confirmed for order ${order.orderNumber}`, performedBy: req.user._id,
      performedByRole: 'buyer', performedByName: req.user.name, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const reportDeliveryIssue = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (!isBuyerOfOrder(order, req.user._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (order.status === 'completed') return res.status(400).json({ status: false, message: 'Order already completed' });
    order.deliveryIssue = { reported: true, reason, description, reportedAt: new Date() };
    await order.save();
    await notificationService.send({ recipient: order.buyer, type: 'delivery_delayed',
      title: { en: 'Delivery Issue Reported', ar: 'تم الإبلاغ عن مشكلة توصيل' },
      body: { en: `Issue reported for order #${order.orderNumber}: ${reason}`, ar: `تم الإبلاغ عن مشكلة للطلب #${order.orderNumber}: ${reason}` },
      data: { orderId: order._id, orderNumber: order.orderNumber }, channels: ['in_app', 'email'], link: `/orders/${orderId}` });
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── SHIPPING INSTRUCTIONS ───────────────────────────────

export const setShippingInstructions = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { instructions } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (!isBuyerOfOrder(order, req.user._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    order.shippingInstructions = instructions;
    await order.save();
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── PRODUCTION TIMELINE ─────────────────────────────────

export const updateProductionTimeline = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { startDate, estimatedCompletionDate, actualCompletionDate } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });

    if (!order.productionTimeline) order.productionTimeline = {};
    if (startDate) order.productionTimeline.startDate = new Date(startDate);
    if (estimatedCompletionDate) order.productionTimeline.estimatedCompletionDate = new Date(estimatedCompletionDate);
    if (actualCompletionDate) order.productionTimeline.actualCompletionDate = new Date(actualCompletionDate);

    if (startDate) {
      await addTimelineEvent(order, 'Production Started', `Production started on ${new Date(startDate).toLocaleDateString()}`);
    }
    if (actualCompletionDate) {
      await addTimelineEvent(order, 'Production Completed', `Production completed on ${new Date(actualCompletionDate).toLocaleDateString()}`);
    }
    await order.save();

    await createAuditLog({ action: 'update', resource: 'production_timeline', resourceId: order._id,
      description: `Production timeline updated for order ${order.orderNumber}`, performedBy: req.user._id,
      performedByRole: 'vendor', performedByName: req.user.name, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── SHIPPING NOTES (PUBLIC) ─────────────────────────────

export const addShippingNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { text } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!text) return res.status(400).json({ status: false, message: 'Note text is required' });

    order.shippingNotes.push({ author: req.user._id, text });
    await order.save();
    res.json({ status: true, data: order.shippingNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateShippingNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const { text } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const note = order.shippingNotes.id(noteId);
    if (!note) return res.status(404).json({ status: false, message: 'Note not found' });
    if (String(note.author) !== String(req.user._id)) return res.status(403).json({ status: false, message: 'Not your note' });
    note.text = text;
    note.updatedAt = new Date();
    await order.save();
    res.json({ status: true, data: order.shippingNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteShippingNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    order.shippingNotes.pull({ _id: noteId });
    await order.save();
    res.json({ status: true, data: order.shippingNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── INTERNAL NOTES (PRIVATE) ────────────────────────────

export const addInternalNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { text } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    // Internal notes: vendor or admin only
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    const isVendorUser = vendorDoc && isVendorOfOrder(order, vendorDoc._id);
    if (!isVendorUser && req.user.role !== 'admin') return res.status(403).json({ status: false, message: 'Not authorized' });
    if (!text) return res.status(400).json({ status: false, message: 'Note text is required' });
    order.internalNotes.push({ author: req.user._id, text });
    await order.save();
    res.json({ status: true, data: order.internalNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateInternalNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const { text } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const note = order.internalNotes.id(noteId);
    if (!note) return res.status(404).json({ status: false, message: 'Note not found' });
    if (String(note.author) !== String(req.user._id)) return res.status(403).json({ status: false, message: 'Not your note' });
    // Save edit history
    note.editHistory.push({ text: note.text, editedAt: new Date() });
    note.text = text;
    note.updatedAt = new Date();
    await order.save();
    res.json({ status: true, data: order.internalNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteInternalNote = async (req, res) => {
  try {
    const { orderId, noteId } = req.params;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    order.internalNotes.pull({ _id: noteId });
    await order.save();
    res.json({ status: true, data: order.internalNotes });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── DELIVERY APPOINTMENT ────────────────────────────────

export const requestDeliveryAppointment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { requestedDate, requestedTimeSlot } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (!isBuyerOfOrder(order, req.user._id)) return res.status(403).json({ status: false, message: 'Not your order' });

    if (!order.deliveryAppointment) order.deliveryAppointment = {};
    order.deliveryAppointment.requestedDate = new Date(requestedDate);
    order.deliveryAppointment.requestedTimeSlot = requestedTimeSlot;
    order.deliveryAppointment.status = 'pending';
    if (!order.deliveryAppointment.history) order.deliveryAppointment.history = [];
    order.deliveryAppointment.history.push({ action: 'requested', date: new Date(), note: `Requested ${new Date(requestedDate).toLocaleDateString()} ${requestedTimeSlot || ''}`, by: 'buyer' });
    await order.save();
    res.json({ status: true, data: order.deliveryAppointment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const respondToAppointment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, suggestedDate, suggestedTimeSlot, note } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!['accepted', 'suggested', 'rejected'].includes(action)) return res.status(400).json({ status: false, message: 'Invalid action' });

    if (!order.deliveryAppointment) order.deliveryAppointment = {};
    order.deliveryAppointment.status = action;
    if (action === 'suggested') {
      order.deliveryAppointment.vendorSuggestedDate = suggestedDate ? new Date(suggestedDate) : undefined;
      order.deliveryAppointment.vendorSuggestedTimeSlot = suggestedTimeSlot;
    }
    order.deliveryAppointment.vendorResponseNote = note || '';
    order.deliveryAppointment.respondedAt = new Date();
    if (!order.deliveryAppointment.history) order.deliveryAppointment.history = [];
    order.deliveryAppointment.history.push({ action, date: new Date(), note: note || action, by: 'vendor' });
    await order.save();

    await notificationService.send({ recipient: order.buyer, type: 'shipment_status_updated',
      title: { en: 'Delivery Appointment Updated', ar: 'تم تحديث موعد التسليم' },
      body: { en: `Vendor ${action} the delivery appointment for order #${order.orderNumber}`, ar: `قام البائع ${action === 'accepted' ? 'بقبول' : action === 'suggested' ? 'باقتراح' : 'برفض'} موعد التسليم للطلب #${order.orderNumber}` },
      data: { orderId: order._id, orderNumber: order.orderNumber }, channels: ['in_app', 'email'], link: `/orders/${orderId}` });

    res.json({ status: true, data: order.deliveryAppointment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── SHIPMENT PHOTOS ─────────────────────────────────────

export const uploadShipmentPhoto = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { photoType, description } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    order.shipmentPhotos.push({
      url: req.file.path || `/uploads/${req.file.filename}`,
      photoType: photoType || 'product',
      description: description || '',
    });
    await order.save();
    res.json({ status: true, data: order.shipmentPhotos });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteShipmentPhoto = async (req, res) => {
  try {
    const { orderId, photoId } = req.params;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    order.shipmentPhotos.pull({ _id: photoId });
    await order.save();
    res.json({ status: true, data: order.shipmentPhotos });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── SHIPPING LABELS ─────────────────────────────────────

export const uploadShippingLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });
    if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

    order.shippingLabels.push({ url: req.file.path || `/uploads/${req.file.filename}`, fileName: req.file.originalname, mimeType: req.file.mimetype });
    await order.save();
    res.json({ status: true, data: order.shippingLabels });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteShippingLabel = async (req, res) => {
  try {
    const { orderId, labelId } = req.params;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    order.shippingLabels.pull({ _id: labelId });
    await order.save();
    res.json({ status: true, data: order.shippingLabels });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── PARTIAL SHIPMENTS ───────────────────────────────────

export const createPartialShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { quantity, items, shippingCompany, trackingNumber, trackingUrl, shipmentRefNumber,
      shippingMethod, shippingCost, estimatedShippingDate, estimatedDeliveryDate } = req.body;

    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });

    const shipmentNumber = (order.partialShipments?.length || 0) + 1;
    const partialShipment = {
      shipmentNumber,
      quantity,
      items: items || [],
      shippingDetails: {
        carrier: shippingCompany, trackingNumber, trackingUrl, shipmentRefNumber,
        shippingMethod, shippingCost: shippingCost ? Number(shippingCost) : undefined,
        estimatedShippingDate: estimatedShippingDate ? new Date(estimatedShippingDate) : undefined,
        estimatedDelivery: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
        shippedAt: new Date(),
      },
      shipmentStatus: 'shipped',
      trackingHistory: [{ status: 'shipped', timestamp: new Date(), note: `Partial shipment #${shipmentNumber} created` }],
      timeline: [{ event: 'Shipped', timestamp: new Date(), description: `Partial shipment #${shipmentNumber} via ${shippingCompany}` }],
      packages: [],
      documents: [],
      shippingNotes: [],
      internalNotes: [],
      photos: [],
      labels: [],
    };

    if (!order.partialShipments) order.partialShipments = [];
    order.partialShipments.push(partialShipment);

    // Update main order status if first partial shipment
    if (order.status === 'in_escrow') {
      order.status = 'shipped';
      order.shipmentStatus = 'shipped';
    }

    await order.save();
    await createAuditLog({ action: 'create', resource: 'partial_shipment', resourceId: order._id,
      description: `Partial shipment #${shipmentNumber} created for order ${order.orderNumber}`,
      performedBy: req.user._id, performedByRole: 'vendor', performedByName: req.user.name,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updatePartialShipmentStatus = async (req, res) => {
  try {
    const { orderId, shipmentNumber } = req.params;
    const { status, location, note, delayReason, delayComment } = req.body;
    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || !isVendorOfOrder(order, vendorDoc._id)) return res.status(403).json({ status: false, message: 'Not your order' });

    const ps = order.partialShipments.find(s => s.shipmentNumber === parseInt(shipmentNumber));
    if (!ps) return res.status(404).json({ status: false, message: 'Partial shipment not found' });

    const allowed = VALID_TRANSITIONS[ps.shipmentStatus];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot transition from ${ps.shipmentStatus} to ${status}` });
    }

    if (delayReason && DELAY_REASONS.includes(delayReason)) {
      ps.delayReason = { reason: delayReason, customComment: delayComment || '', delayedAt: new Date() };
    }

    ps.shipmentStatus = status;
    ps.trackingHistory.push({ status, location: location || '', note: note || `Status updated to ${status}`, timestamp: new Date() });
    ps.timeline.push({
      event: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      timestamp: new Date(),
      description: delayReason ? `Delayed: ${delayReason.replace(/_/g, ' ')}` : (note || ''),
    });

    if (status === 'delivered') {
      if (!ps.shippingDetails) ps.shippingDetails = {};
      ps.shippingDetails.deliveredAt = new Date();
      ps.shippingDetails.actualDeliveryDate = new Date();
    }

    await order.save();
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updatePartialShipmentTracking = async (req, res) => {
  try {
    const { orderId, shipmentNumber } = req.params;
    const { trackingNumber, trackingUrl, carrier, estimatedDelivery } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const ps = order.partialShipments.find(s => s.shipmentNumber === parseInt(shipmentNumber));
    if (!ps) return res.status(404).json({ status: false, message: 'Partial shipment not found' });
    if (!ps.shippingDetails) ps.shippingDetails = {};
    if (trackingNumber) ps.shippingDetails.trackingNumber = trackingNumber;
    if (trackingUrl) ps.shippingDetails.trackingUrl = trackingUrl;
    if (carrier) ps.shippingDetails.carrier = carrier;
    if (estimatedDelivery) ps.shippingDetails.estimatedDelivery = new Date(estimatedDelivery);
    ps.trackingHistory.push({ status: 'tracking_updated', timestamp: new Date(), note: 'Tracking information updated' });
    await order.save();
    res.json({ status: true, data: order });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── PACKAGES (within partial or main shipment) ──────────

export const addPackage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shipmentNumber, packageNumber, weight, dimensions, quantity, description, barcode } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    if (shipmentNumber) {
      const ps = order.partialShipments.find(s => s.shipmentNumber === parseInt(shipmentNumber));
      if (!ps) return res.status(404).json({ status: false, message: 'Partial shipment not found' });
      if (!ps.packages) ps.packages = [];
      ps.packages.push({ packageNumber: packageNumber || (ps.packages.length + 1), weight, dimensions, quantity, description, barcode });
      await order.save();
      return res.json({ status: true, data: ps.packages });
    }

    if (!order.shipmentPackages) order.shipmentPackages = [];
    order.shipmentPackages.push({ packageNumber: packageNumber || (order.shipmentPackages.length + 1), weight, dimensions, quantity, description, barcode });
    await order.save();
    res.json({ status: true, data: order.shipmentPackages });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const removePackage = async (req, res) => {
  try {
    const { orderId, packageId } = req.params;
    const { shipmentNumber } = req.query;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    if (shipmentNumber) {
      const ps = order.partialShipments.find(s => s.shipmentNumber === parseInt(shipmentNumber));
      if (!ps) return res.status(404).json({ status: false, message: 'Partial shipment not found' });
      if (ps.packages) ps.packages.pull({ _id: packageId });
      await order.save();
      return res.json({ status: true, data: ps.packages || [] });
    }

    if (order.shipmentPackages) order.shipmentPackages.pull({ _id: packageId });
    await order.save();
    res.json({ status: true, data: order.shipmentPackages || [] });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── QUERIES ─────────────────────────────────────────────

export const getShipment = async (req, res) => {
  try {
    const order = await EscrowOrder.findById(req.params.orderId)
      .select('-internalNotes') // NEVER expose internal notes to API consumers
      .populate('buyer', 'name email')
      .populate('vendor', 'companyName');

    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const isParticipant = isBuyerOfOrder(order, req.user._id) ||
      isVendorOfOrder(order, req.user._id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ status: false, message: 'Forbidden' });

    // Strip internal notes for non-vendor/non-admin
    const result = order.toObject();
    if (req.user.role !== 'admin' && !(await Vendor.findOne({ user: req.user._id }))) {
      delete result.internalNotes;
    }

    // Filter internal notes from partial shipments for non-vendor/non-admin
    if (result.partialShipments) {
      result.partialShipments = result.partialShipments.map(ps => {
        if (req.user.role !== 'admin') {
          const isVendorUser = isVendorOfOrder(order, req.user._id);
          if (!isVendorUser) {
            const { internalNotes, ...rest } = ps;
            return rest;
          }
        }
        return ps;
      });
    }

    const vendorDoc = await Vendor.findById(order.vendor._id).select('companyName');
    result.vendorName = vendorDoc?.companyName || order.vendor?.companyName;

    // Calculate shipment completion percentage
    result.shipmentProgress = calculateShipmentProgress(order);

    res.json({ status: true, data: result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

function calculateShipmentProgress(order) {
  // If has partial shipments, calculate based on them
  if (order.partialShipments && order.partialShipments.length > 0) {
    const completed = order.partialShipments.filter(s => s.shipmentStatus === 'delivery_confirmed').length;
    return Math.round((completed / order.partialShipments.length) * 100);
  }
  // Single shipment: use status flow
  const flow = ['pending', 'preparing', 'packed', 'ready_for_pickup', 'shipped', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'delivery_confirmed'];
  const idx = flow.indexOf(order.shipmentStatus);
  return idx >= 0 ? Math.round((idx / (flow.length - 1)) * 100) : 0;
}

export const getShipmentTimeline = async (req, res) => {
  try {
    const order = await EscrowOrder.findById(req.params.orderId)
      .select('orderNumber shipmentStatus timeline trackingHistory partialShipments internalNotes');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const isParticipant = isBuyerOfOrder(order, req.user._id) ||
      isVendorOfOrder(order, req.user._id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ status: false, message: 'Forbidden' });

    const result = { orderNumber: order.orderNumber, shipmentStatus: order.shipmentStatus, timeline: order.timeline, trackingHistory: order.trackingHistory };

    if (req.user.role === 'admin' || isVendorOfOrder(order, req.user._id)) {
      result.internalNotes = order.internalNotes;
    }

    // Add partial shipment timelines
    if (order.partialShipments && order.partialShipments.length > 0) {
      result.partialShipments = order.partialShipments.map(ps => ({
        shipmentNumber: ps.shipmentNumber,
        shipmentStatus: ps.shipmentStatus,
        timeline: ps.timeline,
        trackingHistory: ps.trackingHistory,
      }));
    }

    res.json({ status: true, data: result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getPartialShipments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await EscrowOrder.findById(orderId)
      .select('orderNumber partialShipments internalNotes');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const isParticipant = isBuyerOfOrder(order, req.user._id) ||
      isVendorOfOrder(order, req.user._id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ status: false, message: 'Forbidden' });

    res.json({ status: true, data: { orderNumber: order.orderNumber, partialShipments: order.partialShipments || [] } });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── DASHBOARD QUERIES ───────────────────────────────────

export const getBuyerShipments = async (req, res) => {
  try {
    const { status, shippingCompany, deliveryStatus, escrowStatus, deliveryDate, shipmentDate, page = 1, limit = 20 } = req.query;
    const filter = { buyer: req.user._id };
    if (status) filter.shipmentStatus = status;
    if (shippingCompany) filter['shippingDetails.carrier'] = shippingCompany;
    if (escrowStatus) filter.status = escrowStatus;
    if (deliveryDate) { const d = new Date(deliveryDate); filter['shippingDetails.actualDeliveryDate'] = { $gte: d, $lte: new Date(d.getTime() + 86400000) }; }
    if (shipmentDate) { const d = new Date(shipmentDate); filter['shippingDetails.shippedAt'] = { $gte: d, $lte: new Date(d.getTime() + 86400000) }; }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      EscrowOrder.find(filter)
        .select('orderNumber status shipmentStatus shippingDetails trackingHistory totalAmount currency createdAt updatedAt autoReleaseDate partialShipments productionTimeline shippingInstructions')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      EscrowOrder.countDocuments(filter),
    ]);

    const ordersWithProgress = orders.map(o => ({ ...o.toObject(), shipmentProgress: calculateShipmentProgress(o) }));

    res.json({
      status: true,
      data: {
        orders: ordersWithProgress,
        stats: {
          total: orders.length,
          activeShipments: orders.filter(o => !['completed', 'delivery_confirmed'].includes(o.shipmentStatus)).length,
          delivered: orders.filter(o => o.shipmentStatus === 'delivery_confirmed').length,
          inTransit: orders.filter(o => ['shipped', 'in_transit', 'out_for_delivery'].includes(o.shipmentStatus)).length,
          awaitingEscrow: orders.filter(o => o.status === 'in_escrow').length,
        },
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getVendorShipments = async (req, res) => {
  try {
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc) return res.status(403).json({ status: false, message: 'Vendor profile not found' });

    const { status, shippingCompany, deliveryStatus, escrowStatus, deliveryDate, shipmentDate, page = 1, limit = 20 } = req.query;
    const filter = { vendor: vendorDoc._id };
    if (status) filter.shipmentStatus = status;
    if (shippingCompany) filter['shippingDetails.carrier'] = shippingCompany;
    if (escrowStatus) filter.status = escrowStatus;
    if (deliveryDate) { const d = new Date(deliveryDate); filter['shippingDetails.actualDeliveryDate'] = { $gte: d, $lte: new Date(d.getTime() + 86400000) }; }
    if (shipmentDate) { const d = new Date(shipmentDate); filter['shippingDetails.shippedAt'] = { $gte: d, $lte: new Date(d.getTime() + 86400000) }; }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      EscrowOrder.find(filter)
        .select('orderNumber status shipmentStatus shippingDetails trackingHistory totalAmount currency createdAt updatedAt buyer partialShipments productionTimeline shippingInstructions')
        .populate('buyer', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      EscrowOrder.countDocuments(filter),
    ]);

    const ordersWithProgress = orders.map(o => ({ ...o.toObject(), shipmentProgress: calculateShipmentProgress(o) }));

    res.json({
      status: true,
      data: {
        orders: ordersWithProgress,
        stats: {
          total: orders.length,
          awaitingShipment: orders.filter(o => o.shipmentStatus === 'pending' && o.status === 'in_escrow').length,
          readyToShip: orders.filter(o => ['preparing', 'packed', 'ready_for_pickup'].includes(o.shipmentStatus)).length,
          inTransit: orders.filter(o => ['shipped', 'in_transit', 'customs_clearance', 'out_for_delivery'].includes(o.shipmentStatus)).length,
          delivered: orders.filter(o => o.shipmentStatus === 'delivery_confirmed').length,
        },
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getAdminShipments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ status: false, message: 'Admin only' });
    const { status, shippingCompany, escrowStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.shipmentStatus = status;
    if (shippingCompany) filter['shippingDetails.carrier'] = shippingCompany;
    if (escrowStatus) filter.status = escrowStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      EscrowOrder.find(filter)
        .select('orderNumber status shipmentStatus shippingDetails trackingHistory totalAmount currency createdAt updatedAt buyer vendor deliveryIssue autoReleaseDate partialShipments productionTimeline shippingInstructions internalNotes')
        .populate('buyer', 'name email').populate('vendor', 'companyName')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      EscrowOrder.countDocuments(filter),
    ]);

    // Use aggregation for stats instead of full collection scan
    const statsResult = await EscrowOrder.aggregate([
      { $match: { shipmentStatus: { $ne: 'pending' } } },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $nin: ['$shipmentStatus', ['delivery_confirmed', 'cancelled']] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$shipmentStatus', 'delivery_confirmed'] }, 1, 0] } },
          inTransit: { $sum: { $cond: [{ $in: ['$shipmentStatus', ['shipped', 'in_transit', 'customs_clearance', 'out_for_delivery']] }, 1, 0] } },
          pendingEscrow: { $sum: { $cond: [{ $in: ['$status', ['in_escrow', 'shipped']] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
        },
      },
    ]);

    const allShipments = await EscrowOrder.aggregate([
      { $match: { shipmentStatus: { $ne: 'pending' }, 'shippingDetails.estimatedDelivery': { $ne: null } } },
      { $project: { estimatedDelivery: '$shippingDetails.estimatedDelivery', shipmentStatus: 1, carrier: '$shippingDetails.carrier' } },
    ]);
    const delayed = allShipments.filter(o => new Date(o.estimatedDelivery) < new Date() && o.shipmentStatus !== 'delivery_confirmed').length;
    const shippingCompanies = [...new Set(allShipments.map(o => o.carrier).filter(Boolean))];

    res.json({
      status: true,
      data: {
        orders: orders.map(o => ({ ...o.toObject(), shipmentProgress: calculateShipmentProgress(o) })),
        stats: {
          total: statsResult[0]?.total || 0,
          activeShipments: statsResult[0]?.active || 0,
          delayed,
          delivered: statsResult[0]?.delivered || 0,
          inTransit: statsResult[0]?.inTransit || 0,
          pendingEscrow: statsResult[0]?.pendingEscrow || 0,
          disputed: statsResult[0]?.disputed || 0,
          shippingCompanies,
        },
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── ANALYTICS ───────────────────────────────────────────

export const getShipmentAnalytics = async (req, res) => {
  try {
    const isVendor = req.query.role === 'vendor' || req.user.role === 'vendor';
    const isAdmin = req.user.role === 'admin';

    let matchFilter = { shipmentStatus: { $ne: 'pending' } };
    if (isVendor && !isAdmin) {
      const vendorDoc = await Vendor.findOne({ user: req.user._id });
      if (!vendorDoc) return res.status(403).json({ status: false, message: 'Vendor not found' });
      matchFilter = { ...matchFilter, vendor: vendorDoc._id };
    }

    const analytics = await EscrowOrder.aggregate([
      { $match: matchFilter },
      { $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$shipmentStatus', 'delivery_confirmed'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$shipmentStatus', 'cancelled'] }, 1, 0] } },
          inTransitCount: { $sum: { $cond: [{ $in: ['$shipmentStatus', ['shipped', 'in_transit', 'customs_clearance', 'out_for_delivery']] }, 1, 0] } },
          avgDeliveryDays: { $avg: { $cond: [
            { $and: [{ $ne: ['$shippingDetails.shippedAt', null] }, { $ne: ['$shippingDetails.actualDeliveryDate', null] }] },
            { $divide: [{ $subtract: ['$shippingDetails.actualDeliveryDate', '$shippingDetails.shippedAt'] }, 86400000] },
            null,
          ] } },
          avgFulfillmentDays: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 86400000] } },
          onTimeCount: { $sum: { $cond: [
            { $and: [{ $ne: ['$shippingDetails.estimatedDelivery', null] }, { $ne: ['$shippingDetails.actualDeliveryDate', null] }, { $lte: ['$shippingDetails.actualDeliveryDate', '$shippingDetails.estimatedDelivery'] }] },
            1, 0,
          ] } },
        },
      },
    ]);

    const carrierDist = await EscrowOrder.aggregate([
      { $match: matchFilter },
      { $match: { 'shippingDetails.carrier': { $ne: null } } },
      { $group: { _id: '$shippingDetails.carrier', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const stats = analytics[0] || {};
    const carrierMap = {};
    carrierDist.forEach(c => { carrierMap[c._id] = c.count; });

    res.json({
      status: true,
      data: {
        totalShipments: stats.totalShipments || 0,
        deliveredCount: stats.deliveredCount || 0,
        cancelledCount: stats.cancelledCount || 0,
        inTransitCount: stats.inTransitCount || 0,
        averageDeliveryTimeDays: Math.round((stats.avgDeliveryDays || 0) * 10) / 10,
        averageFulfillmentTimeDays: Math.round((stats.avgFulfillmentDays || 0) * 10) / 10,
        onTimeDeliveryRate: stats.deliveredCount > 0 ? Math.round((stats.onTimeCount / stats.deliveredCount) * 100) : 0,
        deliverySuccessRate: stats.totalShipments > 0 ? Math.round((stats.deliveredCount / stats.totalShipments) * 100) : 0,
        shippingCompanyDistribution: carrierMap,
        mostUsedShippingCompany: carrierDist[0]?._id || 'N/A',
      },
    });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ─── INTERNAL NOTES ACCESSOR (for admin/vendor) ─────────

export const getInternalNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await EscrowOrder.findById(orderId).select('orderNumber internalNotes');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    const isVendorUser = vendorDoc && isVendorOfOrder(order, vendorDoc._id);
    if (!isVendorUser && req.user.role !== 'admin') return res.status(403).json({ status: false, message: 'Not authorized' });
    res.json({ status: true, data: { orderNumber: order.orderNumber, internalNotes: order.internalNotes } });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};
