import crypto from 'crypto';
import File from '../models/File.js';
import FileAccessLog from '../models/FileAccessLog.js';
import SignedUrl from '../models/SignedUrl.js';
import { storageRegistry } from './storage/index.js';
import { FILE_CATEGORIES, SIGNED_URL_EXPIRY } from '../config/storage.js';

class StorageService {
  constructor() {
    this._provider = null;
  }

  getProvider(name) {
    if (name) return storageRegistry.get(name);
    if (!this._provider) {
      this._provider = storageRegistry.getDefault();
    }
    return this._provider;
  }

  get provider() {
    if (!this._provider) {
      this._provider = storageRegistry.getDefault();
    }
    return this._provider;
  }

  set provider(val) {
    this._provider = val;
  }

  _generateChecksum(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  _buildKey(category, subCategory, filename) {
    const catConfig = FILE_CATEGORIES[category]?.[subCategory] || FILE_CATEGORIES.general.uploads;
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${catConfig.path}/${timestamp}-${random}-${sanitizedName}`;
  }

  _getCategoryConfig(category, subCategory) {
    return FILE_CATEGORIES[category]?.[subCategory] || FILE_CATEGORIES.general.uploads;
  }

  async uploadFile({ filePath, buffer, originalName, mimeType, size, category, subCategory, uploadedBy, vendor, entityType, entityId, metadata, providerName }) {
    const catConfig = this._getCategoryConfig(category, subCategory);
    const storageKey = this._buildKey(category, subCategory, originalName);
    const isPublic = catConfig.public;

    let checksum;
    const provider = this.getProvider(providerName);

    let result;
    if (buffer) {
      checksum = this._generateChecksum(buffer);
      result = await provider.uploadBuffer(buffer, storageKey, {
        isPublic,
        contentType: mimeType,
        size,
        metadata: { ...metadata, originalName, category, subCategory },
      });
    } else if (filePath) {
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(filePath);
      checksum = this._generateChecksum(fileBuffer);
      result = await provider.upload(filePath, storageKey, {
        isPublic,
        contentType: mimeType,
        size,
        metadata: { ...metadata, originalName, category, subCategory },
      });
    } else {
      throw new Error('Either filePath or buffer is required');
    }

    const file = await File.create({
      originalName,
      storageKey,
      category,
      subCategory,
      mimeType,
      size: size || 0,
      provider: provider.name,
      bucket: result.bucket,
      isPublic,
      isProtected: !isPublic,
      uploadedBy,
      vendor,
      entityType,
      entityId,
      checksum,
      metadata: { ...metadata, category, subCategory },
    });

    await FileAccessLog.create({
      file: file._id,
      action: 'upload',
      accessedBy: uploadedBy,
      role: metadata?.role,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      success: true,
    });

    return file;
  }

  async getFile(fileId) {
    return File.findById(fileId).populate('uploadedBy', 'name email');
  }

  async getFileByKey(storageKey) {
    return File.findOne({ storageKey, isDeleted: false });
  }

  async deleteFile(fileId, userId, reason) {
    const file = await File.findById(fileId);
    if (!file) throw new Error('File not found');

    const provider = this.getProvider(file.provider);
    await provider.delete(file.storageKey);

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    await FileAccessLog.create({
      file: file._id,
      action: 'delete',
      accessedBy: userId,
      success: true,
      metadata: { reason },
    });

    return file;
  }

  async getSignedUrl(fileId, userId, role, purpose = 'view') {
    const file = await File.findById(fileId);
    if (!file || file.isDeleted) throw new Error('File not found');

    if (file.isProtected) {
      const vendorMatch = file.vendor && userId && file.vendor.toString() === userId;
      const isAdmin = role === 'admin';
      const isUploader = file.uploadedBy && file.uploadedBy.toString() === userId;

      if (!vendorMatch && !isAdmin && !isUploader) {
        throw new Error('Not authorized to access this file');
      }
    }

    const provider = this.getProvider(file.provider);
    const expiresIn = SIGNED_URL_EXPIRY[purpose] || SIGNED_URL_EXPIRY.default;
    const { url, expiresAt } = await provider.getSignedUrl(file.storageKey, expiresIn);

    const token = crypto.randomBytes(32).toString('hex');

    await SignedUrl.create({
      file: file._id,
      token,
      url,
      expiresAt: expiresAt || new Date(Date.now() + expiresIn * 1000),
      createdBy: userId,
      purpose,
    });

    await FileAccessLog.create({
      file: file._id,
      action: 'signed_url_generated',
      accessedBy: userId,
      role,
      success: true,
      metadata: { purpose },
    });

    return { url, expiresAt, token };
  }

  async downloadFile(fileId, userId, role) {
    const file = await File.findById(fileId);
    if (!file || file.isDeleted) throw new Error('File not found');

    if (file.isProtected) {
      const vendorMatch = file.vendor && userId && file.vendor.toString() === userId;
      const isAdmin = role === 'admin';
      const isUploader = file.uploadedBy && file.uploadedBy.toString() === userId;
      if (!vendorMatch && !isAdmin && !isUploader) {
        throw new Error('Not authorized to download this file');
      }
    }

    const provider = this.getProvider(file.provider);
    const signedUrl = await provider.getSignedUrl(file.storageKey, SIGNED_URL_EXPIRY.download);

    await FileAccessLog.create({
      file: file._id,
      action: 'download',
      accessedBy: userId,
      role,
      success: true,
    });

    return { data: null, url: signedUrl.url, file };
  }

  async listFiles(filters = {}) {
    const query = { isDeleted: false };
    if (filters.category) query.category = filters.category;
    if (filters.vendor) query.vendor = filters.vendor;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      File.find(query)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      File.countDocuments(query),
    ]);

    return { files, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getStorageStats() {
    const stats = await File.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' },
        },
      },
      { $sort: { totalSize: -1 } },
    ]);

    const totalResult = await File.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalSize: { $sum: '$size' }, totalFiles: { $sum: 1 } } },
    ]);

    const largestFiles = await File.find({ isDeleted: false })
      .sort({ size: -1 })
      .limit(10)
      .populate('uploadedBy', 'name email')
      .lean();

    return {
      byCategory: stats,
      total: totalResult[0] || { totalSize: 0, totalFiles: 0 },
      largestFiles,
    };
  }

  async getUploadTrends(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return File.aggregate([
      { $match: { createdAt: { $gte: since }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getDownloadTrends(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return FileAccessLog.aggregate([
      { $match: { action: { $in: ['download', 'signed_url_generated'] }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

export const storageService = new StorageService();
export default storageService;
