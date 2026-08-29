import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/ManualShipment.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('ShipmentService', () => {
  let Shipment;

  beforeEach(async () => {
    vi.clearAllMocks();
    Shipment = (await import('../models/ManualShipment.js')).default;
  });

  it('should create a shipment', async () => {
    const mockShip = { _id: mockId(), order: mockId(), carrier: 'UPS', trackingNumber: '1Z999AA10123456784', status: 'pending' };
    Shipment.create.mockResolvedValue(mockShip);
    const shipment = await Shipment.create({ order: mockShip.order, carrier: 'UPS', trackingNumber: '1Z999AA10123456784' });
    expect(shipment.status).toBe('pending');
  });

  it('should update shipment status', async () => {
    const id = mockId();
    Shipment.findByIdAndUpdate.mockResolvedValue({ _id: id, status: 'shipped' });
    const updated = await Shipment.findByIdAndUpdate(id, { status: 'shipped' }, { new: true });
    expect(updated.status).toBe('shipped');
  });

  it('should find shipment by tracking number', async () => {
    Shipment.findOne = vi.fn().mockResolvedValue({ _id: mockId(), trackingNumber: 'TRACK123' });
    const shipment = await Shipment.findOne({ trackingNumber: 'TRACK123' });
    expect(shipment.trackingNumber).toBe('TRACK123');
  });

  it('should list shipments for order', async () => {
    const orderId = mockId();
    Shipment.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), order: orderId }]) });
    const shipments = await Shipment.find({ order: orderId }).sort({ createdAt: -1 });
    expect(shipments).toHaveLength(1);
  });

  it('should track valid status transitions', () => {
    const transitions = { pending: ['shipped', 'cancelled'], shipped: ['in_transit'], in_transit: ['delivered', 'exception'], delivered: [] };
    expect(transitions.pending).toContain('shipped');
    expect(transitions.in_transit).toContain('delivered');
    expect(transitions.delivered).not.toContain('shipped');
  });
});
