import mongoose from 'mongoose';

// String validators
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidPhone = (phone) => /^\+?[\d\s\-()]{7,20}$/.test(phone);
export const isValidUrl = (url) => { try { new URL(url); return true; } catch { return false; } };
export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
export const isValidPassword = (password) => password && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
export const sanitizeHtml = (str) => str?.replace(/<[^>]*>/g, '') || '';
export const truncate = (str, max = 100) => str?.length > max ? str.slice(0, max) + '...' : str;

// Numeric validators
export const isPositiveInt = (val) => Number.isInteger(Number(val)) && Number(val) > 0;
export const isValidAmount = (val) => !isNaN(val) && Number(val) >= 0;
export const isValidPrice = (val) => !isNaN(val) && Number(val) > 0;
export const isValidPercentage = (val) => !isNaN(val) && Number(val) >= 0 && Number(val) <= 100;

// Date validators
export const isValidDate = (val) => !isNaN(new Date(val).getTime());
export const isFutureDate = (val) => isValidDate(val) && new Date(val) > new Date();
export const isPastDate = (val) => isValidDate(val) && new Date(val) < new Date();

// Enum & list validators
export const isValidEnum = (val, allowedValues) => allowedValues.includes(val);
export const isNonEmptyArray = (val) => Array.isArray(val) && val.length > 0;
export const isInRange = (val, min, max) => !isNaN(val) && Number(val) >= min && Number(val) <= max;

// Query validators
export const isValidSortField = (field, allowedFields) => allowedFields.includes(field.replace(/^-/, ''));
export const isValidFilterValue = (val) => val !== undefined && val !== null && val !== '';

// Country & currency
export const isValidCountryCode = (code) => /^[A-Z]{2}$/.test(code);
export const isValidCurrencyCode = (code) => /^[A-Z]{3}$/.test(code);
export const isValidLanguageCode = (code) => /^[a-z]{2}(-[A-Z]{2})?$/.test(code);

// File validators
export const isValidFileSize = (size, maxBytes) => size <= maxBytes;
export const isValidFileType = (mime, allowedMimes) => allowedMimes.includes(mime);

// Sanitization
export const stripWhitespace = (str) => str?.trim().replace(/\s+/g, ' ') || '';
export const toLowerCase = (str) => str?.toLowerCase().trim() || '';

// Object validation
export const isPlainObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val);
export const hasRequiredFields = (obj, fields) => fields.every(f => obj[f] !== undefined && obj[f] !== null && obj[f] !== '');
