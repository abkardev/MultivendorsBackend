import { SellerDocument } from '../models/SellerDocument.js';
import { SellerDocumentVersion } from '../models/SellerDocumentVersion.js';

class DocumentsCenterService {
  async uploadDocument(vendorId, fileData, metadata) {
    const document = await SellerDocument.create({
      vendor: vendorId,
      fileName: fileData.originalname,
      fileType: fileData.mimetype,
      fileSize: fileData.size,
      filePath: fileData.path,
      category: metadata.category || 'uncategorized',
      tags: metadata.tags || [],
      description: metadata.description || '',
      isVerified: false,
      expiresAt: metadata.expiresAt || null,
    });
    await SellerDocumentVersion.create({
      document: document._id,
      vendor: vendorId,
      version: 1,
      fileName: fileData.originalname,
      filePath: fileData.path,
      fileSize: fileData.size,
      uploadedBy: vendorId,
      changeNotes: 'Initial upload',
    });
    return document;
  }

  async getDocuments(vendorId, options = {}) {
    const { category, isVerified, search } = options;
    const filter = { vendor: vendorId };
    if (category) filter.category = category;
    if (isVerified !== undefined) filter.isVerified = isVerified;
    if (search) filter.$or = [
      { fileName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
    return SellerDocument.find(filter).sort({ updatedAt: -1 });
  }

  async getDocument(vendorId, documentId) {
    return SellerDocument.findOne({ _id: documentId, vendor: vendorId });
  }

  async updateDocument(vendorId, documentId, data) {
    return SellerDocument.findOneAndUpdate({ _id: documentId, vendor: vendorId }, { $set: data }, { new: true });
  }

  async deleteDocument(vendorId, documentId) {
    const document = await SellerDocument.findOne({ _id: documentId, vendor: vendorId });
    if (!document) throw new Error('Document not found');
    await SellerDocumentVersion.deleteMany({ document: documentId });
    return SellerDocument.findByIdAndDelete(documentId);
  }

  async getDocumentVersions(vendorId, documentId) {
    return SellerDocumentVersion.find({ document: documentId, vendor: vendorId }).sort({ version: -1 });
  }

  async createNewVersion(vendorId, documentId, fileData, changeNotes) {
    const document = await SellerDocument.findOne({ _id: documentId, vendor: vendorId });
    if (!document) throw new Error('Document not found');
    const latestVersion = await SellerDocumentVersion.findOne({ document: documentId })
      .sort({ version: -1 }).select('version');
    const newVersion = (latestVersion?.version || 0) + 1;
    const version = await SellerDocumentVersion.create({
      document: documentId,
      vendor: vendorId,
      version: newVersion,
      fileName: fileData.originalname,
      filePath: fileData.path,
      fileSize: fileData.size,
      uploadedBy: vendorId,
      changeNotes: changeNotes || `Version ${newVersion}`,
    });
    document.fileName = fileData.originalname;
    document.filePath = fileData.path;
    document.fileSize = fileData.size;
    document.currentVersion = newVersion;
    await document.save();
    return version;
  }

  async getCategories(vendorId) {
    const categories = await SellerDocument.distinct('category', { vendor: vendorId });
    return categories;
  }

  async getDocumentStats(vendorId) {
    const total = await SellerDocument.countDocuments({ vendor: vendorId });
    const verified = await SellerDocument.countDocuments({ vendor: vendorId, isVerified: true });
    const expired = await SellerDocument.countDocuments({
      vendor: vendorId, expiresAt: { $lte: new Date(), $ne: null },
    });
    const categories = await SellerDocument.aggregate([
      { $match: { vendor: vendorId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    return { total, verified, expired, categories };
  }
}

export const documentsCenterService = new DocumentsCenterService();
