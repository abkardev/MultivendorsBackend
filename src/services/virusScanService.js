import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logSecurityEvent } from './securityAuditService.js';
import storageService from './storageService.js';

class VirusScanService {
  constructor() {
    this.enabled = false;
    this.provider = null;
    this._clamav = null;
  }

  async initialize() {
    this.enabled = process.env.VIRUS_SCAN_ENABLED === 'true';
    if (!this.enabled) {
      console.log('[virusScan] Virus scanning is disabled. Set VIRUS_SCAN_ENABLED=true to enable.');
      return;
    }

    const provider = process.env.VIRUS_SCAN_PROVIDER || 'clamav';
    this.provider = provider;

    if (provider === 'clamav') {
      try {
        const clamscan = await import('clamscan');
        this._clamav = await clamscan.init({
          clamdscan: {
            socket: process.env.CLAMD_SOCKET || '/var/run/clamd.scan/clamd.sock',
            host: process.env.CLAMD_HOST || 'localhost',
            port: parseInt(process.env.CLAMD_PORT || '3310'),
            timeout: parseInt(process.env.CLAMD_TIMEOUT || '30000'),
            bypassTest: true,
          },
          preference: 'clamdscan',
        });
        console.log('[virusScan] ClamAV initialized successfully');
      } catch (err) {
        console.warn(`[virusScan] ClamAV not available (${err.message}), falling back to heuristic scan`);
        this._clamav = null;
      }
    }

    console.log(`[virusScan] Initialized with provider: ${provider}${this._clamav ? ' (clamav)' : ' (heuristic)'}`);
  }

  async scan(filePath) {
    if (!this.enabled) {
      return { clean: true, skipped: true, message: 'Virus scanning disabled' };
    }

    try {
      const result = await this._scanWithProvider(filePath);
      await logSecurityEvent({
        action: 'file_scan',
        status: result.clean ? 'success' : 'failure',
        details: `File scan: ${filePath} - ${result.clean ? 'clean' : 'threat found'}`,
        metadata: { filePath, scanResult: result, scanner: this._clamav ? 'clamav' : 'heuristic' },
      });
      return result;
    } catch (err) {
      console.error(`[virusScan] Scan error:`, err);
      await logSecurityEvent({
        action: 'file_scan',
        status: 'failure',
        details: `File scan error: ${filePath} - ${err.message}`,
        metadata: { filePath, error: err.message },
      });
      return { clean: false, error: err.message, message: 'Scan failed - file quarantined' };
    }
  }

  async scanBuffer(buffer, filename) {
    if (!this.enabled) {
      return { clean: true, skipped: true, message: 'Virus scanning disabled' };
    }

    try {
      const result = await this._scanBufferWithProvider(buffer, filename);
      await logSecurityEvent({
        action: 'file_scan',
        status: result.clean ? 'success' : 'failure',
        details: `Buffer scan: ${filename} - ${result.clean ? 'clean' : 'threat found'}`,
        metadata: { filename, scanResult: result, scanner: this._clamav ? 'clamav' : 'heuristic' },
      });
      return result;
    } catch (err) {
      console.error(`[virusScan] Buffer scan error:`, err);
      return { clean: false, error: err.message, message: 'Scan failed - file quarantined' };
    }
  }

  async scanAndUpload({ filePath, originalName, mimeType, size, userId, category, subCategory, entityType, entityId, metadata = {} }) {
    const scanResult = await this.scan(filePath);
    if (!scanResult.clean) {
      await fs.unlink(filePath).catch(() => {});
      await logSecurityEvent({
        action: 'file_upload_blocked',
        status: 'failure',
        performedBy: userId,
        details: `Upload blocked: ${originalName} - threat detected`,
        metadata: { originalName, mimeType, size, scanResult },
      });
      throw new Error(scanResult.error || 'File failed virus scan');
    }

    const file = await storageService.uploadFile({
      filePath,
      originalName,
      mimeType,
      size,
      category: category || 'general',
      subCategory: subCategory || 'uploads',
      uploadedBy: userId,
      entityType,
      entityId,
      metadata: { ...metadata, scanResult: { scannedAt: new Date(), clean: scanResult.clean, threats: scanResult.threats || [], scanner: scanResult.provider || 'heuristic' } },
    });

    const signedUrl = await storageService.getSignedUrl(file._id, userId, metadata.role || 'user', 'view');

    await fs.unlink(filePath).catch(() => {});

    await logSecurityEvent({
      action: 'file_uploaded',
      status: 'success',
      performedBy: userId,
      details: `File uploaded: ${originalName} (${(size / 1024 / 1024).toFixed(2)}MB)`,
      metadata: { fileId: file._id, storageKey: file.storageKey, originalName, mimeType, size, scanResult: { scannedAt: new Date(), clean: true, scanner: scanResult.provider || 'heuristic' } },
    });

    return { file, url: signedUrl.url, expiresAt: signedUrl.expiresAt };
  }

  async _scanWithProvider(filePath) {
    if (this._clamav) {
      return this._scanClamAV(filePath);
    }
    return this._scanHeuristic(filePath);
  }

  async _scanBufferWithProvider(buffer, filename) {
    if (this._clamav) {
      return this._scanBufferClamAV(buffer, filename);
    }
    return this._scanBufferHeuristic(buffer, filename);
  }

  async _scanClamAV(filePath) {
    try {
      const result = await this._clamav.scanFile(filePath);
      if (result.isInfected) {
        return {
          clean: false,
          provider: 'clamav',
          threats: result.viruses || [],
          message: `Threat detected: ${(result.viruses || []).join(', ')}`,
        };
      }
      return { clean: true, provider: 'clamav', message: 'Clean' };
    } catch (err) {
      console.error(`[virusScan] ClamAV scan failed:`, err.message);
      return this._scanHeuristic(filePath);
    }
  }

  async _scanBufferClamAV(buffer, filename) {
    try {
      const result = await this._clamav.scanBuffer(buffer);
      if (result.isInfected) {
        return {
          clean: false,
          provider: 'clamav',
          threats: result.viruses || [],
          message: `Threat detected: ${(result.viruses || []).join(', ')}`,
        };
      }
      return { clean: true, provider: 'clamav', message: 'Clean' };
    } catch (err) {
      console.error(`[virusScan] ClamAV buffer scan failed:`, err.message);
      return this._scanBufferHeuristic(buffer, filename);
    }
  }

  async _scanHeuristic(filePath) {
    const stat = await fs.stat(filePath);
    if (stat.size > 500 * 1024 * 1024) {
      return { clean: false, provider: 'heuristic', threats: ['oversized'], message: 'File exceeds maximum scan size (500MB)' };
    }
    const buffer = await fs.readFile(filePath);
    return this._scanBufferHeuristic(buffer, path.basename(filePath));
  }

  _scanBufferHeuristic(buffer, filename) {
    const threats = [];
    const ext = path.extname(filename || '').toLowerCase();

    if (ext === '.zip' || ext === '.rar') {
      const MIN_COMPRESSION_RATIO = 0.1;
      const rawSize = buffer.length;
      const { valid, entropy } = this._detectZipBomb(buffer);
      if (!valid) {
        threats.push('suspicious_high_entropy');
        return { clean: false, provider: 'heuristic', threats, message: 'File appears to be a ZIP bomb (high entropy)' };
      }
    }

    const nullByteThreshold = 0.6;
    let nullCount = 0;
    for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
      if (buffer[i] === 0) nullCount++;
    }
    if (nullCount / Math.min(buffer.length, 4096) > nullByteThreshold && buffer.length > 1024 * 1024) {
      threats.push('high_null_ratio');
    }

    const textPatterns = [
      { pattern: /This program|PE\0\0|MZ\x90/gi, name: 'pe_executable' },
      { pattern: /#!/g, name: 'script_shebang' },
      { pattern: /eval\s*\(/gi, name: 'eval_usage' },
    ];

    const header = buffer.slice(0, Math.min(buffer.length, 256)).toString('utf-8').substring(0, 100);
    for (const { pattern, name } of textPatterns) {
      if (pattern.test(header)) {
        threats.push(name);
      }
    }

    if (threats.length > 1) {
      return { clean: false, provider: 'heuristic', threats, message: `Suspicious file characteristics: ${threats.join(', ')}` };
    }

    return { clean: true, provider: 'heuristic', message: 'Passed heuristic scan' };
  }

  _detectZipBomb(buffer) {
    if (!buffer || buffer.length < 100) return { valid: true, entropy: 0 };

    const MAX_ENTROPY = 7.5;
    const freq = new Array(256).fill(0);
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
      return { valid: false, entropy };
    }
    return { valid: true, entropy };
  }

  isEnabled() {
    return this.enabled;
  }
}

export const virusScanService = new VirusScanService();
export default virusScanService;
