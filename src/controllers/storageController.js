import expressAsyncHandler from 'express-async-handler';
import storageService from '../services/storageService.js';
import { validateFileType, validateFileSize, validateFileName, sanitizeFileName } from '../utils/fileValidator.js';
import { FILE_CATEGORIES } from '../config/storage.js';

export const uploadFile = expressAsyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: false, message: 'No file attached' });
  }

  const { category = 'general', subCategory = 'uploads', entityType, entityId, vendor } = req.body;

  validateFileName(req.file.originalname);

  const catConfig = FILE_CATEGORIES[category]?.[subCategory];
  if (!catConfig) {
    return res.status(400).json({ status: false, message: `Invalid category: ${category}/${subCategory}` });
  }

  try {
    validateFileType(req.file.mimetype, category, subCategory);
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }

  try {
    validateFileSize(req.file.size, category, subCategory);
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }

  const safeName = sanitizeFileName(req.file.originalname);

  const file = await storageService.uploadFile({
    filePath: req.file.path,
    originalName: safeName,
    mimeType: req.file.mimetype,
    size: req.file.size,
    category,
    subCategory,
    uploadedBy: req.user._id,
    vendor: vendor || req.user._id,
    entityType,
    entityId,
    metadata: {
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  res.status(201).json({
    status: true,
    message: 'File uploaded successfully',
    data: {
      _id: file._id,
      originalName: file.originalName,
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      size: file.size,
      category: file.category,
      subCategory: file.subCategory,
      isPublic: file.isPublic,
      url: file.isPublic ? await storageService.getProvider().getPublicUrl(file.storageKey) : undefined,
      createdAt: file.createdAt,
    },
  });
});

export const getFile = expressAsyncHandler(async (req, res) => {
  const file = await storageService.getFile(req.params.id);
  if (!file || file.isDeleted) {
    return res.status(404).json({ status: false, message: 'File not found' });
  }
  res.json({ status: true, data: file });
});

export const deleteFile = expressAsyncHandler(async (req, res) => {
  await storageService.deleteFile(req.params.id, req.user._id, req.body.reason);
  res.json({ status: true, message: 'File deleted successfully' });
});

export const getSignedUrl = expressAsyncHandler(async (req, res) => {
  const { purpose = 'view' } = req.query;
  const { url, expiresAt, token } = await storageService.getSignedUrl(
    req.params.id,
    req.user._id,
    req.user.role,
    purpose
  );
  res.json({
    status: true,
    data: { url, expiresAt, token },
  });
});

export const downloadFile = expressAsyncHandler(async (req, res) => {
  const result = await storageService.downloadFile(req.params.id, req.user._id, req.user.role);
  if (result.url) {
    return res.redirect(result.url);
  }
  res.set('Content-Type', result.file.mimeType);
  res.set('Content-Disposition', `attachment; filename="${result.file.originalName}"`);
  res.send(result.data);
});

export const listFiles = expressAsyncHandler(async (req, res) => {
  const result = await storageService.listFiles({
    category: req.query.category,
    vendor: req.query.vendor,
    entityType: req.query.entityType,
    entityId: req.query.entityId,
    uploadedBy: req.query.uploadedBy,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  });
  res.json({ status: true, ...result });
});

export const getStorageStats = expressAsyncHandler(async (req, res) => {
  const stats = await storageService.getStorageStats();
  res.json({ status: true, data: stats });
});

export const getUploadTrends = expressAsyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await storageService.getUploadTrends(days);
  res.json({ status: true, data: trends });
});

export const getDownloadTrends = expressAsyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await storageService.getDownloadTrends(days);
  res.json({ status: true, data: trends });
});

export const listCategories = expressAsyncHandler(async (req, res) => {
  res.json({ status: true, data: FILE_CATEGORIES });
});

export const healthCheck = expressAsyncHandler(async (req, res) => {
  const provider = storageService.getProvider();
  const health = await provider.healthCheck();
  res.json({ status: true, data: { provider: provider.name, health } });
});
