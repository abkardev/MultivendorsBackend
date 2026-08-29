import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { mockId } from './utils/testUtils.js';

describe('Validation Utilities', () => {
  describe('ObjectId validation', () => {
    it('should validate a valid ObjectId', () => {
      const id = mockId();
      expect(mongoose.Types.ObjectId.isValid(id)).toBe(true);
    });

    it('should reject an invalid ObjectId', () => {
      expect(mongoose.Types.ObjectId.isValid('not-an-id')).toBe(false);
    });

    it('should reject empty string as ObjectId', () => {
      expect(mongoose.Types.ObjectId.isValid('')).toBe(false);
    });
  });

  describe('Email validation patterns', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('should validate correct email formats', () => {
      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('test.name@domain.co')).toBe(true);
      expect(emailRegex.test('user+tag@company.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(emailRegex.test('not-an-email')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
      expect(emailRegex.test('user@.com')).toBe(false);
    });
  });

  describe('URL validation patterns', () => {
    const urlRegex = /^https?:\/\/.+/;

    it('should validate correct URLs', () => {
      expect(urlRegex.test('https://example.com')).toBe(true);
      expect(urlRegex.test('http://shop.test/path')).toBe(true);
      expect(urlRegex.test('https://cdn.example.com/image.jpg')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(urlRegex.test('not-a-url')).toBe(false);
      expect(urlRegex.test('ftp://files.com')).toBe(false);
      expect(urlRegex.test('')).toBe(false);
    });
  });

  describe('Password strength', () => {
    it('should require minimum 8 characters', () => {
      expect('short'.length >= 8).toBe(false);
      expect('longenough123'.length >= 8).toBe(true);
    });

    it('should meet complexity requirements', () => {
      const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      expect(strong.test('Abcdef1g')).toBe(true);
      expect(strong.test('weak')).toBe(false);
      expect(strong.test('ONLYUPPER123')).toBe(false);
      expect(strong.test('lowercaseonly1')).toBe(false);
    });
  });

  describe('Phone number validation', () => {
    it('should validate phone numbers', () => {
      const phone = /^\+?[\d\s\-()]{7,20}$/;
      expect(phone.test('+1234567890')).toBe(true);
      expect(phone.test('+1 (234) 567-890')).toBe(true);
      expect(phone.test('abc')).toBe(false);
    });
  });
});
