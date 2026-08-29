import { FILE_CATEGORIES } from '../config/storage.js';

const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/svg+xml': ['.svg'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'text/plain': ['.txt'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/msword': ['.doc'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'application/dwg': ['.dwg'],
  'application/dxf': ['.dxf'],
};

const REJECTED_EXTENSIONS = [
  '.exe', '.bat', '.dll', '.js', '.sh', '.php', '.asp', '.aspx',
  '.jar', '.apk', '.msi', '.com', '.scr', '.pif', '.vbs', '.ps1',
  '.wsf', '.cgi', '.pl', '.py', '.rb', '.hta', '.cmd', '.reg',
];

const REJECTED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/x-php',
  'application/x-java-archive',
  'application/vnd.android.package-archive',
  'application/x-ms-installer',
  'application/x-javascript',
  'text/javascript',
  'application/javascript',
  'application/x-httpd-php',
  'application/x-httpd-php-source',
  'text/x-php',
  'text/x-perl',
  'text/x-python',
  'application/x-python-code',
  'application/x-ruby',
  'application/x-ms-shortcut',
  'application/x-mspublisher',
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
];

const MIME_MAP = { ...ALLOWED_MIME_TYPES };

export function getExtensionFromMime(mimeType) {
  return MIME_MAP[mimeType]?.[0] || '.bin';
}

export function getAllowedMimes(category, subCategory) {
  const config = FILE_CATEGORIES[category]?.[subCategory] || FILE_CATEGORIES.general.uploads;
  return config.allowedMimes;
}

export function validateFileType(mimeType, extension) {
  const ext = (extension || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (REJECTED_MIME_TYPES.includes(mime)) {
    return { valid: false, error: `File type ${mimeType} is rejected for security reasons` };
  }

  if (ext && REJECTED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension ${extension} is not allowed (executable files are rejected)` };
  }

  if (!ALLOWED_MIME_TYPES[mime]) {
    return { valid: false, error: `File type ${mimeType} is not allowed` };
  }

  if (ext) {
    const allowedExts = ALLOWED_MIME_TYPES[mime];
    if (!allowedExts.includes(ext)) {
      return { valid: false, error: `Extension ${ext} does not match MIME type ${mimeType}` };
    }
  }

  return { valid: true };
}

export function validateFileSize(size, maxSize) {
  if (typeof size !== 'number' || size < 0) {
    return { valid: false, error: 'Invalid file size' };
  }
  if (size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024) * 10) / 10;
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }
  return { valid: true };
}

export function validateFileName(name) {
  if (!name || name.length > 255) {
    return { valid: false, error: 'Invalid file name' };
  }
  const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerous.test(name)) {
    return { valid: false, error: 'File name contains invalid characters' };
  }
  if (name.startsWith('.') || name.endsWith('.') || name.includes('..')) {
    return { valid: false, error: 'File name contains path traversal patterns' };
  }
  return { valid: true };
}

export function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

export function detectZipBomb(buffer) {
  if (!buffer || buffer.length < 100) return { valid: true };

  const MAX_ENTROPY = 7.5;
  let freq = new Array(256).fill(0);
  for (let i = 0; i < buffer.length; i++) {
    freq[buffer[i]]++;
  }
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / buffer.length;
      entropy -= p * Math.log2(p);
    }
  }
  if (entropy > MAX_ENTROPY) {
    return { valid: false, error: 'File appears to be suspicious (high entropy detected)', entropy };
  }
  return { valid: true, entropy };
}
