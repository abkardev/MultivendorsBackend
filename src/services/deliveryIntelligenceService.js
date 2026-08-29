import mongoose from 'mongoose';

class DeliveryIntelligenceService {
  async getDeliveryReliability(vendorId) {
    try {
      const { default: commerce } = await import('./commerceIntelligenceService.js');
      return await commerce.getDeliveryIntelligence(vendorId);
    } catch {
      return { reliability: 0, confidence: 0, delayProbability: 0, message: 'No delivery data available' };
    }
  }

  async getShippingConfidence(shipmentId) {
    try {
      const Shipment = mongoose.model('Shipment');
      const shipment = await Shipment.findById(shipmentId).lean();
      if (!shipment) return { confidence: 0, message: 'Shipment not found' };
      const vendorIntel = await this.getDeliveryReliability(shipment.vendor);
      return {
        confidence: vendorIntel.reliability || 50,
        expectedDelay: vendorIntel.delayProbability || 0,
        vendorReliability: vendorIntel.reliability || 0,
      };
    } catch { return { confidence: 50, expectedDelay: 0, vendorReliability: 0 }; }
  }
}

export default new DeliveryIntelligenceService();
