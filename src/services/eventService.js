import crypto from 'crypto';
import MarketplaceEvent from '../models/MarketplaceEvent.js';
import { eventBusService } from './eventBusService.js';

/**
 * Known event types for reference
 */
export const EVENT_TYPES = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_RETURN_REQUESTED: 'order.return_requested',
  ORDER_RETURN_APPROVED: 'order.return_approved',
  ORDER_RETURN_REJECTED: 'order.return_rejected',
  ORDER_COMPLETED: 'order.completed',
  
  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Escrow events
  ESCROW_HELD: 'escrow.held',
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_REFUNDED: 'escrow.refunded',
  ESCROW_DISPUTED: 'escrow.disputed',
  
  // Shipment events
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
  SHIPMENT_DELIVERED: 'shipment.delivered',
  
  // RFQ events
  RFQ_CREATED: 'rfq.created',
  RFQ_QUOTATION_SUBMITTED: 'rfq.quotation_submitted',
  RFQ_QUOTATION_ACCEPTED: 'rfq.quotation_accepted',
  
  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_VERIFIED: 'user.verified',
  
  // Vendor events
  VENDOR_REGISTERED: 'vendor.registered',
  VENDOR_APPROVED: 'vendor.approved',
  VENDOR_REJECTED: 'vendor.rejected',
  
  // Support events
  TICKET_CREATED: 'support.ticket_created',
  TICKET_UPDATED: 'support.ticket_updated',
  
  // System events
  SYSTEM_ERROR: 'system.error',
  SECURITY_ALERT: 'system.security_alert',
};

export const bridgeToEventBus = true;

/**
 * Emit a marketplace event
 * Non-blocking - never throws
 */
export async function emitEvent(eventData) {
  const eventId = `EVT-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    const event = await MarketplaceEvent.create({
      eventId,
      eventType: eventData.eventType,
      version: eventData.version || '1.0',
      source: eventData.source,
      producer: eventData.producer || 'api',
      userId: eventData.userId,
      vendorId: eventData.vendorId,
      orderId: eventData.orderId,
      escrowId: eventData.escrowId,
      shipmentId: eventData.shipmentId,
      paymentId: eventData.paymentId,
      data: eventData.data,
      previousState: eventData.previousState,
      severity: eventData.severity || 'info',
      correlationId: eventData.correlationId,
      ttl: eventData.ttl || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 day retention
    });
    try {
      await eventBusService.publishEvent(eventData.eventType, eventData.data || {}, eventData.source || 'api');
    } catch (bridgeErr) {
      // Non-blocking: bridge failure must never break the main flow
      console.error('EventBus bridge publish failed:', bridgeErr.message);
    }
    return event;
  } catch (err) {
    // Event logging should never block the main flow
    console.error('Event emission failed:', err.message);
    return null;
  }
}

/**
 * Get events with optional filters
 */
export async function getEvents(filters = {}, pagination = {}) {
  const { page = 1, limit = 50 } = pagination;
  const query = {};
  
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.source) query.source = filters.source;
  if (filters.userId) query.userId = filters.userId;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.severity) query.severity = filters.severity;
  if (filters.correlationId) query.correlationId = filters.correlationId;
  
  const skip = (page - 1) * limit;
  
  const [events, total] = await Promise.all([
    MarketplaceEvent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MarketplaceEvent.countDocuments(query),
  ]);
  
  if (events.length > 0) {
    return { events, total, page, totalPages: Math.ceil(total / limit) };
  }
  
  try {
    const busResult = await eventBusService.getEvents(filters);
    return {
      events: busResult.events,
      total: busResult.total,
      page: busResult.page,
      totalPages: busResult.totalPages,
    };
  } catch {
    return { events, total, page, totalPages: Math.ceil(total / limit) };
  }
}
