import { FILE_CATEGORIES } from '../../config/storage.js';

export class StorageProvider {
  constructor(config) {
    this.config = config || {};
    this.name = 'base';
  }

  async upload(filePath, destPath, options) {
    throw new Error('upload() must be implemented by subclass');
  }

  async uploadBuffer(buffer, destPath, options) {
    throw new Error('uploadBuffer() must be implemented by subclass');
  }

  async download(filePath) {
    throw new Error('download() must be implemented by subclass');
  }

  async delete(filePath) {
    throw new Error('delete() must be implemented by subclass');
  }

  async getSignedUrl(filePath, expiresIn) {
    throw new Error('getSignedUrl() must be implemented by subclass');
  }

  async list(prefix) {
    throw new Error('list() must be implemented by subclass');
  }

  async exists(filePath) {
    throw new Error('exists() must be implemented by subclass');
  }

  async getMetadata(filePath) {
    throw new Error('getMetadata() must be implemented by subclass');
  }

  async copy(sourcePath, destPath) {
    throw new Error('copy() must be implemented by subclass');
  }

  async getPublicUrl(filePath) {
    throw new Error('getPublicUrl() must be implemented by subclass');
  }

  async healthCheck() {
    return { provider: this.name, status: 'unknown' };
  }

  getCategoryConfig(category) {
    for (const group of Object.values(FILE_CATEGORIES)) {
      for (const [key, val] of Object.entries(group)) {
        if (key === category) return val;
      }
    }
    return FILE_CATEGORIES.general.uploads;
  }
}
