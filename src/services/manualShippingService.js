import { ManualShipment } from '../models/ManualShipment.js';

class ManualShippingService {
  async createShipment(vendorId, data) {
    return ManualShipment.create({
      ...data,
      vendor: vendorId,
      status: 'pending',
    });
  }

  async getShipments(vendorId, options = {}) {
    const { status, orderId, search } = options;
    const filter = { vendor: vendorId };
    if (status) filter.status = status;
    if (orderId) filter.order = orderId;
    if (search) filter.$or = [
      { carrierName: { $regex: search, $options: 'i' } },
      { trackingNumber: { $regex: search, $options: 'i' } },
    ];
    return ManualShipment.find(filter).populate('order', 'orderNumber total').sort({ createdAt: -1 });
  }

  async getShipment(vendorId, shipmentId) {
    return ManualShipment.findOne({ _id: shipmentId, vendor: vendorId })
      .populate('order', 'orderNumber total status')
      .populate('buyer', 'name email');
  }

  async updateShipment(vendorId, shipmentId, data) {
    const shipment = await ManualShipment.findOneAndUpdate(
      { _id: shipmentId, vendor: vendorId },
      { $set: data },
      { new: true }
    );
    if (!shipment) throw new Error('Shipment not found');
    return shipment;
  }

  async updateShipmentStatus(vendorId, shipmentId, status, notes) {
    const shipment = await ManualShipment.findOne({ _id: shipmentId, vendor: vendorId });
    if (!shipment) throw new Error('Shipment not found');
    shipment.status = status;
    if (status === 'shipped') shipment.shippedAt = new Date();
    else if (status === 'delivered') shipment.deliveredAt = new Date();
    else if (status === 'cancelled') shipment.cancelledAt = new Date();
    if (notes) shipment.notes = notes;
    shipment.lastUpdated = new Date();
    await shipment.save();
    return shipment;
  }

  async addTrackingUpdate(vendorId, shipmentId, updateData) {
    const shipment = await ManualShipment.findOne({ _id: shipmentId, vendor: vendorId });
    if (!shipment) throw new Error('Shipment not found');
    shipment.trackingUpdates = shipment.trackingUpdates || [];
    shipment.trackingUpdates.push({
      status: updateData.status,
      location: updateData.location,
      description: updateData.description,
      timestamp: new Date(),
    });
    shipment.lastUpdated = new Date();
    if (updateData.status) shipment.status = updateData.status;
    await shipment.save();
    return shipment;
  }

  async attachDocument(vendorId, shipmentId, documentId) {
    const shipment = await ManualShipment.findOne({ _id: shipmentId, vendor: vendorId });
    if (!shipment) throw new Error('Shipment not found');
    shipment.documents = shipment.documents || [];
    if (!shipment.documents.includes(documentId)) {
      shipment.documents.push(documentId);
      await shipment.save();
    }
    return shipment;
  }

  async getShipmentStats(vendorId) {
    const shipments = await ManualShipment.find({ vendor: vendorId });
    const total = shipments.length;
    const pending = shipments.filter(s => s.status === 'pending').length;
    const shipped = shipments.filter(s => s.status === 'shipped').length;
    const inTransit = shipments.filter(s => s.status === 'in_transit').length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    const cancelled = shipments.filter(s => s.status === 'cancelled').length;
    const onTime = shipments.filter(s =>
      s.status === 'delivered' && s.estimatedDelivery && s.deliveredAt && s.deliveredAt <= s.estimatedDelivery
    ).length;
    return { total, pending, shipped, inTransit, delivered, cancelled, onTimeDelivery: shipped > 0 ? Math.round((onTime / shipped) * 100) : 0 };
  }

  async deleteShipment(vendorId, shipmentId) {
    return ManualShipment.findOneAndDelete({ _id: shipmentId, vendor: vendorId });
  }
}

export const manualShippingService = new ManualShippingService();
