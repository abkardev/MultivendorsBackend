import AuditLog from '../models/AuditLog.js';

export const listAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, resource, userId, startDate, endDate, search } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.performedBy = userId;
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { performedByName: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      status: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('performedBy', 'name email');
    if (!log) return res.status(404).json({ status: false, message: 'Audit log not found' });
    res.json({ status: true, data: log });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAuditResources = async (req, res) => {
  try {
    const resources = await AuditLog.distinct('resource');
    res.json({ status: true, data: resources });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAuditStats = async (req, res) => {
  try {
    const [totalLogs, actionCounts, resourceCounts, recentErrors] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AuditLog.find({ action: { $in: ['delete', 'reject'] } })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      status: true,
      data: {
        totalLogs,
        actionCounts,
        resourceCounts,
        recentErrors,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteAuditLog = async (req, res) => {
  try {
    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Audit log deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const clearAuditLogs = async (req, res) => {
  try {
    const { olderThanDays = 90 } = req.body;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ status: true, message: `Deleted ${result.deletedCount} logs older than ${olderThanDays} days` });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
