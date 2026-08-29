import { Invoice } from '../models/Invoice.js';
import { TaxEngine } from './TaxEngine.js';

export class InvoiceEngine {
  async generateOrderInvoice(order, buyer, vendor, items) {
    const taxEngine = new TaxEngine();
    const tax = await taxEngine.calculate({
      amount: order.total, country: order.shippingAddress?.country || 'SA', currency: order.currency,
    });
    const subtotal = order.total - tax.amount;
    const invoice = await Invoice.create({
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      type: 'order', order: order._id, buyer: buyer._id, vendor: vendor._id,
      amount: order.total, taxAmount: tax.amount, taxRate: tax.rate, subtotal, total: order.total,
      currency: order.currency || 'SAR', status: 'issued', dueDate: new Date(Date.now() + 30 * 86400000),
      issuedAt: new Date(),
      items: (items || []).map(i => ({
        description: i.name, quantity: i.quantity, unitPrice: i.price,
        total: i.quantity * i.price, taxRate: tax.rate,
      })),
      companyInfo: {
        name: vendor.storeName?.en || vendor.storeName,
        nameAr: vendor.storeName?.ar,
        taxNumber: vendor.taxNumber, crNumber: vendor.crNumber,
        phone: vendor.phone, email: vendor.email,
      },
      buyerInfo: { name: buyer.name || buyer.companyName, email: buyer.email },
    });
    return invoice;
  }

  async generateSubscriptionInvoice(subscription, user) {
    const invoice = await Invoice.create({
      invoiceNumber: `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      type: 'subscription', buyer: user._id, amount: subscription.price,
      total: subscription.price, currency: subscription.currency || 'SAR',
      status: 'issued', dueDate: new Date(Date.now() + 7 * 86400000), issuedAt: new Date(),
      items: [{ description: `${subscription.plan} Subscription`, quantity: 1, unitPrice: subscription.price, total: subscription.price }],
      buyerInfo: { name: user.name || user.companyName, email: user.email },
    });
    return invoice;
  }

  async getInvoice(invoiceId) {
    return Invoice.findById(invoiceId).populate('buyer', 'name email companyName').populate('vendor', 'storeName').lean();
  }

  async listBuyerInvoices(buyerId) {
    return Invoice.find({ buyer: buyerId }).sort({ createdAt: -1 }).lean();
  }

  async listVendorInvoices(vendorId) {
    return Invoice.find({ vendor: vendorId }).sort({ createdAt: -1 }).lean();
  }

  async markPaid(invoiceId) {
    return Invoice.findByIdAndUpdate(invoiceId, { status: 'paid', paidAt: new Date() }, { new: true });
  }

  async cancelInvoice(invoiceId) {
    return Invoice.findByIdAndUpdate(invoiceId, { status: 'cancelled' }, { new: true });
  }
}

export const invoiceEngine = new InvoiceEngine();
