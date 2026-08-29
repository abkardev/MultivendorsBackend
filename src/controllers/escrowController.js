import EscrowOrder from '../models/Order.js';
import Payment from '../models/Payment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Dispute from '../models/Dispute.js';
import { Vendor } from '../models/vendorModel.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import { canAccess } from '../utils/ownership.js';
import { paymentOrchestrator } from '../services/payment/PaymentOrchestrator.js';
import { getLogger } from '../services/logger.js';

const logger = getLogger('payment');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PAYMENT_MODE = process.env.PAYMENT_MODE || (NODE_ENV === 'production' ? 'live' : 'test');

// Simulation is ONLY allowed outside production and only when PAYMENT_MODE=test.
const simulationAllowed = NODE_ENV !== 'production' && PAYMENT_MODE === 'test';

const METHOD_TO_PROVIDER_METHOD = {
  credit_card: 'card',
  mada: 'mada',
  apple_pay: 'apple_pay',
  google_pay: 'google_pay',
  stc_pay: 'stc_pay',
  sadad: 'sadad',
  paypal: 'paypal',
};

// Helper: get or create wallet
const getOrCreateWallet = async (userId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, currency });
  }
  return wallet;
};

// Helper: log transaction
const logTransaction = async ({ wallet, user, type, amount, currency, reference, description }) => {
  const balance = type === 'escrow_hold'
    ? wallet.pendingBalance
    : wallet.availableBalance;
  
  return Transaction.create({
    wallet: wallet._id,
    user,
    type,
    amount,
    currency,
    balance,
    reference,
    description,
  });
};

// ─── PAYMENT ─────────────────────────────────────────────

export const createPayment = async (req, res) => {
  try {
    const { orderId, method, currency } = req.body;
    const buyerId = req.user._id;

    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (order.buyer.toString() !== buyerId.toString()) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }
    if (!['pending', 'awaiting_payment'].includes(order.status)) {
      return res.status(400).json({ status: false, message: 'Order cannot be paid in current status' });
    }

    // Check for duplicate payment
    const existingPayment = await Payment.findOne({ order: orderId, status: { $in: ['completed', 'processing'] } });
    if (existingPayment) {
      return res.status(400).json({ status: false, message: 'Payment already exists for this order' });
    }

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      buyer: buyerId,
      amount: order.totalAmount,
      currency: currency || order.currency,
      method,
      status: 'pending',
    });

    let checkoutUrl = null;

    const providerMethod = METHOD_TO_PROVIDER_METHOD[method];

    if (method === 'bank_transfer') {
      // Legitimate manual flow: awaiting human verification. Never auto-complete.
      payment.status = 'processing';
      await payment.save();
    } else if (simulationAllowed) {
      // Dev/test-only simulation. NEVER reachable in production.
      logger.warn({ orderId, method }, 'Simulated payment used in test mode');
      payment.status = 'completed';
      payment.gatewayRef = `sim_${Date.now()}`;
      await payment.save();
    } else if (!providerMethod) {
      // Production or PAYMENT_MODE=live with an unknown method: fail loudly.
      logger.error({ orderId, method }, 'Unsupported payment method in live mode');
      return res.status(503).json({ status: false, message: 'Unsupported payment method. Configure payment gateway integration.' });
    } else {
      // Real gateway flow. Must NOT mark the payment completed here; the
      // provider webhook drives the transition to a verified state.
      try {
        const gateway = await paymentOrchestrator.createPayment({
          amount: Number(order.totalAmount),
          currency: currency || order.currency,
          method: providerMethod,
          description: `Order ${order.orderNumber}`,
          buyerCountry: 'SA',
          vendorCountry: 'SA',
        });
        payment.gatewayRef = gateway.id || gateway.checkoutId || null;
        payment.gatewayResponse = gateway;
        checkoutUrl = gateway.sourceUrl || gateway.url || gateway.checkoutUrl || null;
      } catch (err) {
        logger.error({ err, orderId, providerMethod }, 'Payment provider unavailable');
        return res.status(503).json({
          status: false,
          message: 'Payment gateway unavailable. Configure a payment provider or retry later.',
        });
      }
      if (!checkoutUrl && !payment.gatewayRef) {
        // No usable gateway response — do NOT fake success.
        return res.status(503).json({ status: false, message: 'Payment gateway returned no checkout session.' });
      }
      payment.status = 'pending';
      await payment.save();
    }

    // Only a webhook-verified completion may move the order into escrow.

    // If payment completed, move to escrow
    if (payment.status === 'completed') {
      order.status = 'in_escrow';
      order.paymentId = payment._id;
      order.paymentMethod = method;
      // Auto-release after 7 days from now (can be adjusted)
      order.autoReleaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await order.save();

      // Credit seller's pending balance
      const vendorDoc = await Vendor.findById(order.vendor);
      if (vendorDoc) {
        const sellerWallet = await getOrCreateWallet(vendorDoc.user, order.currency);
        sellerWallet.pendingBalance += order.totalAmount;
        await sellerWallet.save();

        await logTransaction({
          wallet: sellerWallet,
          user: vendorDoc.user,
          type: 'escrow_hold',
          amount: order.totalAmount,
          currency: order.currency,
          reference: order._id.toString(),
          description: `Escrow hold for order ${order.orderNumber}`,
        });
      }
    }

    res.status(201).json({
      status: true,
      data: { payment, checkoutUrl },
      message: 'Payment created successfully',
    });
  } catch (error) {
    console.error('createPayment error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

// ─── ESCROW ACTIONS ──────────────────────────────────────

export const updateShipping = async (req, res) => {
  try {
    const { orderId, carrier, trackingNumber, estimatedDelivery } = req.body;

    const order = await EscrowOrder.findById(orderId).populate('vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    // Verify seller owns this order
    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || order.vendor.toString() !== vendorDoc._id.toString()) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }
    if (order.status !== 'in_escrow') {
      return res.status(400).json({ status: false, message: 'Order must be in escrow to update shipping' });
    }

    order.shippingDetails = {
      carrier,
      trackingNumber,
      shippedAt: new Date(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
    };
    order.status = 'shipped';
    await order.save();

    res.json({ status: true, data: order });
  } catch (error) {
    console.error('updateShipping error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }
    if (!['shipped', 'in_escrow'].includes(order.status)) {
      return res.status(400).json({ status: false, message: 'Cannot confirm delivery in current status' });
    }

    order.status = 'delivered';
    if (order.shippingDetails) {
      order.shippingDetails.deliveredAt = new Date();
    }
    await order.save();

    // Release escrow funds
    await releaseFundsInternal(order);

    res.json({ status: true, data: order });
  } catch (error) {
    console.error('confirmDelivery error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const releaseFunds = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    // Only admin can manually release
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Admin only' });
    }

    await releaseFundsInternal(order);
    res.json({ status: true, data: order });
  } catch (error) {
    console.error('releaseFunds error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

// Internal helper to release escrow
async function releaseFundsInternal(order) {
  const vendorDoc = await Vendor.findById(order.vendor);
  if (!vendorDoc) throw new Error('Vendor not found');

  const sellerWallet = await getOrCreateWallet(vendorDoc.user, order.currency);

  // Move from pending to available
  sellerWallet.pendingBalance = Math.max(0, sellerWallet.pendingBalance - order.totalAmount);
  sellerWallet.availableBalance += order.totalAmount;
  await sellerWallet.save();

  await logTransaction({
    wallet: sellerWallet,
    user: vendorDoc.user,
    type: 'escrow_release',
    amount: order.totalAmount,
    currency: order.currency,
    reference: order._id.toString(),
    description: `Escrow released for order ${order.orderNumber}`,
  });

  order.status = 'completed';
  order.escrowReleasedAt = new Date();
  await order.save();
}

// ─── WALLET ──────────────────────────────────────────────

export const getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);
    res.json({ status: true, data: wallet });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      status: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const withdraw = async (req, res) => {
  try {
    const { amount, currency, bankDetails } = req.body;

    const wallet = await getOrCreateWallet(req.user._id);
    if (wallet.availableBalance < amount) {
      return res.status(400).json({ status: false, message: 'Insufficient balance' });
    }

    const withdrawal = await WithdrawalRequest.create({
      user: req.user._id,
      amount,
      currency: currency || wallet.currency,
      bankDetails,
    });

    // Deduct from available balance
    wallet.availableBalance -= amount;
    await wallet.save();

    await logTransaction({
      wallet,
      user: req.user._id,
      type: 'withdrawal',
      amount: -amount,
      currency: wallet.currency,
      reference: withdrawal._id.toString(),
      description: `Withdrawal request of ${amount} ${wallet.currency}`,
    });

    res.status(201).json({ status: true, data: withdrawal });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [withdrawals, total] = await Promise.all([
      WithdrawalRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      WithdrawalRequest.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      status: true,
      data: withdrawals,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

// ─── DISPUTES ────────────────────────────────────────────

export const openDispute = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    const files = req.files || [];

    const order = await EscrowOrder.findById(orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: false, message: 'Not your order' });
    }
    if (!['in_escrow', 'shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ status: false, message: 'Cannot dispute in current status' });
    }

    const evidence = files.map((f) => ({
      type: f.mimetype.startsWith('image/') ? 'image' : 'document',
      url: f.path, // adjust to your upload handler (S3, local, etc.)
      uploadedBy: req.user._id,
    }));

    if (description) {
      evidence.push({ type: 'note', note: description, uploadedBy: req.user._id });
    }

    const dispute = await Dispute.create({
      order: orderId,
      buyer: order.buyer,
      vendor: order.vendor,
      reason,
      description,
      evidence,
    });

    // Freeze the order
    order.status = 'disputed';
    await order.save();

    res.status(201).json({ status: true, data: dispute });
  } catch (error) {
    console.error('openDispute error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { disputeId, decision, amount, notes } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Admin only' });
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ status: false, message: 'Dispute not found' });
    if (!['open', 'under_review'].includes(dispute.status)) {
      return res.status(400).json({ status: false, message: 'Dispute already resolved' });
    }

    const order = await EscrowOrder.findById(dispute.order);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const vendorDoc = await Vendor.findById(order.vendor);
    if (!vendorDoc) return res.status(404).json({ status: false, message: 'Vendor not found' });

    const sellerWallet = await getOrCreateWallet(vendorDoc.user, order.currency);

    if (decision === 'refund') {
      // Remove from seller's pending balance
      sellerWallet.pendingBalance = Math.max(0, sellerWallet.pendingBalance - amount);
      await sellerWallet.save();

      await logTransaction({
        wallet: sellerWallet,
        user: vendorDoc.user,
        type: 'refund',
        amount: -amount,
        currency: order.currency,
        reference: order._id.toString(),
        description: `Refund issued for order ${order.orderNumber} via dispute resolution`,
      });

      order.status = 'refunded';
    } else if (decision === 'release') {
      await releaseFundsInternal(order);
    }

    dispute.status = decision === 'refund' ? 'resolved_refund' : 'resolved_release';
    dispute.resolution = {
      decision,
      amount,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      notes,
    };
    await dispute.save();
    await order.save();

    res.json({ status: true, data: dispute });
  } catch (error) {
    console.error('resolveDispute error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const { role } = req.params;
    const query = role === 'buyer' ? { buyer: req.user._id } : { vendor: req.user._id };
    const orders = await EscrowOrder.find(query).sort({ createdAt: -1 });
    res.json({ status: true, data: orders });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getOrders = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Forbidden' });
    }
    const orders = await EscrowOrder.find().sort({ createdAt: -1 });
    res.json({ status: true, data: orders });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await EscrowOrder.findById(req.params.id).populate('buyer vendor');
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const buyerId = order.buyer?._id || order.buyer;
    if (canAccess(req.user, buyerId)) {
      return res.json({ status: true, data: order });
    }

    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (vendorDoc && (order.vendor?._id || order.vendor).toString() === vendorDoc._id.toString()) {
      return res.json({ status: true, data: order });
    }

    return res.status(404).json({ status: false, message: 'Order not found' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getMyDisputes = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { $or: [{ buyer: req.user._id }, { vendor: req.user._id }] };
    const disputes = await Dispute.find(query).sort({ createdAt: -1 });
    res.json({ status: true, data: disputes });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getAllDisputes = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Forbidden' });
    }
    const disputes = await Dispute.find().sort({ createdAt: -1 });
    res.json({ status: true, data: disputes });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id).populate('buyer vendor order');
    if (!dispute) return res.status(404).json({ status: false, message: 'Dispute not found' });

    const buyerId = dispute.buyer?._id || dispute.buyer;
    if (canAccess(req.user, buyerId)) {
      return res.json({ status: true, data: dispute });
    }

    const vendorDoc = await Vendor.findOne({ user: req.user._id });
    if (vendorDoc && (dispute.vendor?._id || dispute.vendor).toString() === vendorDoc._id.toString()) {
      return res.json({ status: true, data: dispute });
    }

    return res.status(404).json({ status: false, message: 'Dispute not found' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const addEvidence = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const files = req.files || [];
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ status: false, message: 'Dispute not found' });

    const buyerId = dispute.buyer?._id || dispute.buyer;
    if (!canAccess(req.user, buyerId)) {
      const vendorDoc = await Vendor.findOne({ user: req.user._id });
      if (!vendorDoc || (dispute.vendor?._id || dispute.vendor).toString() !== vendorDoc._id.toString()) {
        return res.status(404).json({ status: false, message: 'Dispute not found' });
      }
    }

    const newEvidence = files.map((f) => ({
      type: f.mimetype.startsWith('image/') ? 'image' : 'document',
      url: f.path,
      uploadedBy: req.user._id,
    }));

    dispute.evidence.push(...newEvidence);
    await dispute.save();
    res.json({ status: true, data: dispute });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getPaymentByOrder = async (req, res) => {
  try {
    const order = await EscrowOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    const buyerId = order.buyer?._id || order.buyer;
    if (!canAccess(req.user, buyerId)) {
      const vendorDoc = await Vendor.findOne({ user: req.user._id });
      if (!vendorDoc || (order.vendor?._id || order.vendor).toString() !== vendorDoc._id.toString()) {
        return res.status(404).json({ status: false, message: 'Order not found' });
      }
    }

    const payment = await Payment.findOne({ order: req.params.orderId });
    res.json({ status: true, data: payment });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
