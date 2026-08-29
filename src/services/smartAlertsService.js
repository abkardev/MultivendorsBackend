import mongoose from 'mongoose';

class SmartAlertsService {
  async checkForAlerts(userId) {
    const alerts = [];
    const Order = mongoose.model('Order');
    const Shipment = mongoose.model('Shipment');
    const escrows = await this.getExpiringEscrows(userId);
    const shipments = await this.getDelayedShipments(userId);

    for (const e of escrows) {
      alerts.push({ type: 'escrow_expiring', priority: 'high', message: `Escrow for order ${e.orderId} is expiring soon`, data: e });
    }
    for (const s of shipments) {
      alerts.push({ type: 'shipment_delayed', priority: 'high', message: `Shipment ${s.trackingNumber} is delayed`, data: s });
    }
    return alerts;
  }

  async getExpiringEscrows(userId) {
    try {
      const Payment = mongoose.model('Payment');
      const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return await Payment.find({ buyer: userId, method: 'escrow', status: 'pending', releaseDate: { $lte: threeDays } }).lean();
    } catch { return []; }
  }

  async getDelayedShipments(userId) {
    try {
      const Shipment = mongoose.model('Shipment');
      return await Shipment.find({ buyer: userId, delayed: true, status: { $ne: 'delivered' } }).lean();
    } catch { return []; }
  }
}

export default new SmartAlertsService();
