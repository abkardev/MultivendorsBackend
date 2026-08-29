import expressAsyncHandler from 'express-async-handler';
import { ProcurementRequest, PurchaseOrder } from '../models/procurementModel.js';
import { AppError } from '../middlewares/errorHandler.js';

// --- Procurement Requests ---

export const getProcurementRequests = expressAsyncHandler(async (req, res) => {
  const filter = { buyer: req.user._id };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const prs = await ProcurementRequest.find(filter).sort({ createdAt: -1 });
  res.json({ status: true, data: prs });
});

export const getProcurementRequestById = expressAsyncHandler(async (req, res) => {
  const pr = await ProcurementRequest.findOne({ _id: req.params.id, buyer: req.user._id });
  if (!pr) throw new AppError('Procurement request not found', 404);
  res.json({ status: true, data: pr });
});

export const createProcurementRequest = expressAsyncHandler(async (req, res) => {
  const pr = await ProcurementRequest.create({ ...req.body, buyer: req.user._id });
  res.status(201).json({ status: true, data: pr });
});

export const updateProcurementRequest = expressAsyncHandler(async (req, res) => {
  const pr = await ProcurementRequest.findOneAndUpdate(
    { _id: req.params.id, buyer: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!pr) throw new AppError('Procurement request not found', 404);
  res.json({ status: true, data: pr });
});

export const deleteProcurementRequest = expressAsyncHandler(async (req, res) => {
  const pr = await ProcurementRequest.findOneAndDelete({ _id: req.params.id, buyer: req.user._id });
  if (!pr) throw new AppError('Procurement request not found', 404);
  res.json({ status: true, message: 'Deleted' });
});

export const submitForApproval = expressAsyncHandler(async (req, res) => {
  const pr = await ProcurementRequest.findOneAndUpdate(
    { _id: req.params.id, buyer: req.user._id, status: 'draft' },
    { status: 'pending_approval' },
    { new: true }
  );
  if (!pr) throw new AppError('Procurement request not found or already submitted', 404);
  res.json({ status: true, data: pr });
});

// --- Purchase Orders ---

export const getPurchaseOrders = expressAsyncHandler(async (req, res) => {
  const filter = { buyer: req.user._id };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const pos = await PurchaseOrder.find(filter).populate('vendor', 'storeName slug').sort({ createdAt: -1 });
  res.json({ status: true, data: pos });
});

export const getPurchaseOrderById = expressAsyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, buyer: req.user._id })
    .populate('vendor', 'storeName slug storeImage');
  if (!po) throw new AppError('Purchase order not found', 404);
  res.json({ status: true, data: po });
});

export const createPurchaseOrder = expressAsyncHandler(async (req, res) => {
  const po = await PurchaseOrder.create({ ...req.body, buyer: req.user._id });
  await ProcurementRequest.findByIdAndUpdate(req.body.procurementRequest, { status: 'ordered' });
  res.status(201).json({ status: true, data: po });
});

export const updatePurchaseOrder = expressAsyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, buyer: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('vendor', 'storeName slug');
  if (!po) throw new AppError('Purchase order not found', 404);
  res.json({ status: true, data: po });
});

export const getProcurementStats = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [prCounts, poCounts] = await Promise.all([
    ProcurementRequest.aggregate([
      { $match: { buyer: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { buyer: userId } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const byStatus = (arr, field) => {
    const obj = {};
    arr.forEach(i => obj[i._id] = i[field] || 0);
    return obj;
  };

  res.json({
    status: true,
    data: {
      requests: byStatus(prCounts, 'count'),
      orders: byStatus(poCounts, 'count'),
      totalSpent: poCounts.reduce((s, i) => s + (i.total || 0), 0),
      totalRequests: prCounts.reduce((s, i) => s + i.count, 0),
      totalOrders: poCounts.reduce((s, i) => s + i.count, 0),
    },
  });
});
