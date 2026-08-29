import { Document } from '../models/Document.js';
import { createAuditLog } from '../middlewares/auditMiddleware.js';

export const listDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, docType, category, owner, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (docType) filter.docType = docType;
    if (category) filter.category = category;
    if (owner) filter.owner = owner;
    else if (req.user.role !== 'admin') filter.owner = req.user._id;
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Document.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Document.countDocuments(filter),
    ]);
    res.json({ status: true, data: docs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate('owner', 'name email').populate('reviewedBy', 'name email');
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }
    res.json({ status: true, data: doc });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { title, description, docType, category, tags, isPublic, expiryDate, fileName, fileUrl } = req.body;
    const doc = await Document.create({
      title, description, docType, category: category || 'other',
      owner: req.user._id, tags, isPublic, expiryDate,
      versions: [{ versionNumber: 1, fileName, fileUrl, uploadedBy: req.user._id }],
    });
    await createAuditLog({ action: 'create', resource: 'document', resourceId: doc._id, description: `Created document: ${title.en}`, performedBy: req.user._id, performedByRole: req.user.role, performedByName: req.user.name });
    res.status(201).json({ status: true, data: doc });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }
    Object.assign(doc, req.body);
    await doc.save();
    res.json({ status: true, data: doc });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }
    await Document.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const addVersion = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    const { fileName, fileUrl, notes } = req.body;
    const versionNumber = (doc.currentVersion || 0) + 1;
    doc.versions.push({ versionNumber, fileName, fileUrl, notes, uploadedBy: req.user._id });
    doc.currentVersion = versionNumber;
    await doc.save();
    res.json({ status: true, data: doc });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const reviewDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ status: false, message: 'Admin only' });
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ status: false, message: 'Invalid status' });
    const doc = await Document.findByIdAndUpdate(req.params.id, {
      status, reviewedBy: req.user._id, reviewedAt: new Date(), reviewNotes,
    }, { new: true });
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    res.json({ status: true, data: doc });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getExpiringDocuments = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    const docs = await Document.find({
      expiryDate: { $lte: threshold, $gte: new Date() },
      status: 'approved',
    }).populate('owner', 'name email');
    res.json({ status: true, data: docs });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
