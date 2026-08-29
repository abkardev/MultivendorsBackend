import { paymentOrchestrator } from '../services/payment/PaymentOrchestrator.js';
import { PaymentTransaction } from '../services/payment/models/PaymentTransaction.js';
import { webhookEngine } from '../services/payment/engines/WebhookEngine.js';
import { escrowEngine } from '../services/payment/engines/EscrowEngine.js';
import { refundEngine } from '../services/payment/engines/RefundEngine.js';
import { invoiceEngine } from '../services/payment/engines/InvoiceEngine.js';
import { fraudEngine } from '../services/payment/engines/FraudEngine.js';
import { PaymentProviderConfig } from '../services/payment/models/PaymentProviderModel.js';
import { PaymentAudit } from '../services/payment/models/PaymentAudit.js';
import { Currency, ExchangeRate } from '../services/payment/models/Currency.js';
import { CommissionRule } from '../services/payment/models/CommissionRule.js';
import { TaxRule } from '../services/payment/models/TaxRule.js';
import { providerRegistry } from '../services/payment/ProviderRegistry.js';
import { Vendor } from '../models/vendorModel.js';
import { sanitizeBody } from '../utils/sanitizeBody.js';
import { canAccess } from '../utils/ownership.js';

export const createPayment = async (req, res) => {
  try {
    const { orderId, amount, currency, provider, method, returnUrl } = req.body;
    const result = await paymentOrchestrator.createPayment({
      orderId, amount, currency, provider, method, buyerCountry: req.user?.country || 'SA',
      vendorCountry: req.body.vendorCountry || 'SA', successUrl: returnUrl, cancelUrl: req.body.cancelUrl,
      description: req.body.description, metadata: { userId: req.user?._id?.toString() },
    });
    const tx = await PaymentTransaction.create({
      order: orderId, buyer: req.user._id, transactionId: result.id, providerTransactionId: result.id,
      provider: result.provider || provider, amount, currency, status: 'pending', type: 'payment',
      paymentMethod: method, metadata: { requestBody: sanitizeBody(req.body) },
    });
    await PaymentAudit.create({
      action: 'payment.create', actor: req.user._id, actorRole: req.user.role,
      transaction: tx._id, order: orderId, description: `Payment created ${amount} ${currency}`,
    });
    res.json({ success: true, data: { ...result, transactionId: tx._id } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const capturePayment = async (req, res) => {
  try {
    const { paymentId, provider, amount } = sanitizeBody(req.body);
    const tx = await PaymentTransaction.findOne({ providerTransactionId: paymentId });
    if (tx) {
      const buyerId = tx.buyer?._id || tx.buyer;
      if (!canAccess(req.user, buyerId)) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
    }
    const result = await paymentOrchestrator.capturePayment(paymentId, amount, provider);
    await PaymentTransaction.findOneAndUpdate(
      { providerTransactionId: paymentId },
      { status: 'captured', capturedAt: new Date() },
    );
    await PaymentAudit.create({
      action: 'payment.capture', actor: req.user._id, actorRole: req.user.role,
      description: `Payment captured ${paymentId}`,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const refundPaymentByAdmin = async (req, res) => {
  try {
    const { transactionId, amount, reason } = sanitizeBody(req.body);
    const refund = await refundEngine.createRefund(transactionId, amount, reason, 'admin', req.user._id);
    const result = await refundEngine.processRefund(refund._id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId, provider } = req.params;
    const tx = await PaymentTransaction.findOne({ providerTransactionId: paymentId, provider }).lean();
    if (tx) {
      const buyerId = tx.buyer?._id || tx.buyer;
      if (!canAccess(req.user, buyerId)) {
        if (tx.vendor) {
          const vid = tx.vendor?._id || tx.vendor;
          const vendorDoc = await Vendor.findOne({ user: req.user._id });
          if (!vendorDoc || vid.toString() !== vendorDoc._id.toString()) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
          }
        } else {
          return res.status(404).json({ success: false, message: 'Payment not found' });
        }
      }
    }
    const result = await paymentOrchestrator.getPaymentStatus(paymentId, provider);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { items, currency, successUrl, cancelUrl, provider, method } = sanitizeBody(req.body);
    const amount = items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
    const result = await paymentOrchestrator.createCheckoutSession({
      items, amount, currency, provider, method, successUrl, cancelUrl,
      buyerCountry: req.user?.country || 'SA', vendorCountry: req.body.vendorCountry || 'SA',
      metadata: { userId: req.user?._id?.toString() },
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const handleWebhook = async (provider) => async (req, res) => {
  try {
    const raw = req.body;
    const event = await webhookEngine.receive(provider, raw, req.headers);
    try { await webhookEngine.process(event._id); } catch {}
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'vendor') filter.vendor = req.user.vendorId;
    if (req.user.role === 'buyer') filter.buyer = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;
    const transactions = await PaymentTransaction.find(filter)
      .populate('order', 'orderNumber total').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTransactionDetail = async (req, res) => {
  try {
    const tx = await PaymentTransaction.findById(req.params.id)
      .populate('order buyer vendor', 'name email companyName storeName').lean();
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const buyerId = tx.buyer?._id || tx.buyer;
    if (!canAccess(req.user, buyerId)) {
      if (tx.vendor) {
        const vid = tx.vendor?._id || tx.vendor;
        const vendorDoc = await Vendor.findOne({ user: req.user._id });
        if (!vendorDoc || vid.toString() !== vendorDoc._id.toString()) {
          return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
    }

    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Escrow */
export const holdEscrow = async (req, res) => {
  try {
    const { orderId, vendorId, amount, currency } = sanitizeBody(req.body);
    const escrow = await escrowEngine.holdFunds(
      { _id: orderId }, { _id: req.user._id }, { _id: vendorId }, amount, currency,
    );
    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const releaseEscrow = async (req, res) => {
  try {
    const { EscrowAccountPb } = await import('../services/payment/models/EscrowAccount.js');
    const escrow = await EscrowAccountPb.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });

    if (req.user.role !== 'admin') {
      const vendorDoc = await Vendor.findOne({ user: req.user._id });
      if (!vendorDoc || escrow.vendor.toString() !== vendorDoc._id.toString()) {
        return res.status(404).json({ success: false, message: 'Escrow not found' });
      }
    }

    const { note } = sanitizeBody(req.body);
    const result = await escrowEngine.releaseFunds(req.params.id, req.user._id, note);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const refundEscrow = async (req, res) => {
  try {
    const { EscrowAccountPb } = await import('../services/payment/models/EscrowAccount.js');
    const escrow = await EscrowAccountPb.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });

    const buyerId = escrow.buyer?._id || escrow.buyer;
    if (!canAccess(req.user, buyerId)) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const { reason } = sanitizeBody(req.body);
    const result = await escrowEngine.refundFunds(req.params.id, req.user._id, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getEscrow = async (req, res) => {
  try {
    const escrow = await escrowEngine.getEscrowByOrder(req.params.orderId);
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });

    const buyerId = escrow.buyer?._id || escrow.buyer;
    if (!canAccess(req.user, buyerId)) {
      if (escrow.vendor) {
        const vid = escrow.vendor?._id || escrow.vendor;
        const vendorDoc = await Vendor.findOne({ user: req.user._id });
        if (!vendorDoc || vid.toString() !== vendorDoc._id.toString()) {
          return res.status(404).json({ success: false, message: 'Escrow not found' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Escrow not found' });
      }
    }

    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listVendorEscrows = async (req, res) => {
  try {
    const escrows = await escrowEngine.listVendorEscrows(req.user.vendorId);
    res.json({ success: true, data: escrows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Invoices */
export const getInvoice = async (req, res) => {
  try {
    const invoice = await invoiceEngine.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const buyerId = invoice.buyer?._id || invoice.buyer;
    if (!canAccess(req.user, buyerId)) {
      if (invoice.vendor) {
        const vid = invoice.vendor?._id || invoice.vendor;
        const vendorDoc = await Vendor.findOne({ user: req.user._id });
        if (!vendorDoc || vid.toString() !== vendorDoc._id.toString()) {
          return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyInvoices = async (req, res) => {
  try {
    const invoices = req.user.role === 'vendor'
      ? await invoiceEngine.listVendorInvoices(req.user.vendorId)
      : await invoiceEngine.listBuyerInvoices(req.user._id);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Admin */
export const adminListProviderConfigs = async (req, res) => {
  try {
    const configs = await PaymentProviderConfig.find().lean();
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateProviderConfig = async (req, res) => {
  try {
    const config = await PaymentProviderConfig.findOneAndUpdate(
      { provider: req.params.provider }, sanitizeBody(req.body), { new: true, upsert: true },
    );
    await providerRegistry.refreshProvider(req.params.provider);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const adminListCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find().lean();
    const rates = await ExchangeRate.find().sort({ date: -1 }).limit(200).lean();
    res.json({ success: true, data: { currencies, rates } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateCurrency = async (req, res) => {
  try {
    const currency = await Currency.findOneAndUpdate(
      { code: req.params.code }, sanitizeBody(req.body), { new: true, upsert: true },
    );
    res.json({ success: true, data: currency });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const adminUpdateExchangeRate = async (req, res) => {
  try {
    const { from, to, rate, source } = req.body;
    const result = await import('../services/payment/engines/CurrencyEngine.js').then(
      m => m.currencyEngine.updateRate(from, to, rate, source),
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const adminListCommissionRules = async (req, res) => {
  try {
    const rules = await import('../services/payment/engines/CommissionEngine.js').then(m => m.commissionEngine.listRules());
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateCommissionRule = async (req, res) => {
  try {
    const rule = await import('../services/payment/engines/CommissionEngine.js').then(m => m.commissionEngine.createRule(sanitizeBody(req.body)));
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const adminListTaxRules = async (req, res) => {
  try {
    const rules = await import('../services/payment/engines/TaxEngine.js').then(m => m.taxEngine.listRules());
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateTaxRule = async (req, res) => {
  try {
    const rule = await import('../services/payment/engines/TaxEngine.js').then(m => m.taxEngine.createRule(sanitizeBody(req.body)));
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const adminListFraudReports = async (req, res) => {
  try {
    const reports = await import('../services/payment/engines/FraudEngine.js').then(m => m.fraudEngine.listReports());
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminListWebhookEvents = async (req, res) => {
  try {
    const events = await import('../services/payment/engines/WebhookEngine.js').then(m => m.webhookEngine.listEvents());
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminListAudits = async (req, res) => {
  try {
    const audits = await PaymentAudit.find().sort({ createdAt: -1 }).limit(200).populate('actor', 'name email').lean();
    res.json({ success: true, data: audits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminHealthCheck = async (req, res) => {
  try {
    const results = {};
    const providers = providerRegistry.getAvailableProviders();
    for (const name of providers) {
      try {
        const provider = await providerRegistry.getProvider(name);
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = { healthy: false, error: 'Not configured' };
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Webhook events */
export const listWebhookEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider = req.query.provider;
    const events = await webhookEngine.listEvents(filter);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const retryWebhookEvent = async (req, res) => {
  try {
    const result = await webhookEngine.process(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
