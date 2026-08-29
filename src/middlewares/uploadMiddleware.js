import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateFileType, validateFileSize, sanitizeFileName } from '../utils/fileValidator.js';
import { FILE_CATEGORIES, STORAGE_LIMITS } from '../config/storage.js';

const CATEGORY_MAP = {
  documents: { category: 'products', subCategory: 'documents' },
  product_images: { category: 'products', subCategory: 'images' },
  vendor_logos: { category: 'vendors', subCategory: 'logos' },
  dispute_evidence: { category: 'support', subCategory: 'attachments' },
  shipment_docs: { category: 'general', subCategory: 'uploads' },
  factory_videos: { category: 'factories', subCategory: 'videos' },
  profile_images: { category: 'general', subCategory: 'uploads' },
  general: { category: 'general', subCategory: 'uploads' },
};

export const UPLOAD_CATEGORIES = {
  DOCUMENT: 'documents',
  PRODUCT_IMAGE: 'product_images',
  VENDOR_LOGO: 'vendor_logos',
  DISPUTE_EVIDENCE: 'dispute_evidence',
  SHIPMENT_DOC: 'shipment_docs',
  FACTORY_VIDEO: 'factory_videos',
  PROFILE_IMAGE: 'profile_images',
  GENERAL: 'general',
};

function getCategoryConfig(category) {
  const mapped = CATEGORY_MAP[category];
  if (!mapped) return FILE_CATEGORIES.general.uploads;
  const cfg = FILE_CATEGORIES[mapped.category]?.[mapped.subCategory];
  return cfg || FILE_CATEGORIES.general.uploads;
}

export const createUploadMiddleware = (category = 'general') => {
  const config = getCategoryConfig(category);
  const maxSize = config.maxSize || STORAGE_LIMITS.maxFileSize || 10 * 1024 * 1024;
  const destDir = `uploads/${category}/`;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, ext);
      const safeName = sanitizeFileName(baseName);
      cb(null, `${Date.now()}-${safeName}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const typeCheck = validateFileType(file.mimetype, ext);
    if (!typeCheck.valid) {
      return cb(new Error(typeCheck.error));
    }
    const sizeCheck = validateFileSize(file.size, maxSize);
    if (!sizeCheck.valid) {
      return cb(new Error(sizeCheck.error));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
      files: 10,
    },
  });
};
