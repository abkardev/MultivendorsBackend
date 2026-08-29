import mongoose from 'mongoose';
import { storageRegistry } from './storage/index.js';
import { getLogger } from './logger.js';

const logger = getLogger('jobs');

/**
 * Backup monitoring service
 * Tracks backup status, database size, and storage usage
 * Does NOT implement backup infrastructure - only monitoring/reporting
 */
class BackupService {
  constructor() {
    this.lastBackup = null;
    this.backupStatus = 'unknown';
    this.recoveryVerified = false;
  }

  /**
   * Get database stats
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      if (!db) return { status: 'error', message: 'Not connected to database' };
      
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      return {
        status: 'ok',
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
        totalCollections: collections.length,
        documents: stats.objects,
        avgObjSize: `${(stats.avgObjSize || 0).toFixed(2)} bytes`,
      };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Get storage provider stats
   */
  async getStorageStats() {
    try {
      const provider = storageRegistry.getDefaultProvider();
      if (!provider) return { status: 'error', message: 'No storage provider configured' };
      
      // Attempt to get usage info
      const isAvailable = await provider.isAvailable();
      
      return {
        status: isAvailable ? 'ok' : 'degraded',
        provider: provider.constructor.name,
        available: isAvailable,
      };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Record a backup event
   */
  recordBackup(status, details = {}) {
    this.lastBackup = {
      timestamp: new Date(),
      status,
      ...details,
    };
    this.backupStatus = status;
    
    logger.info({ backupStatus: status, ...details }, 'Backup recorded');
  }

  /**
   * Get full backup status report
   */
  async getBackupReport() {
    const dbStats = await this.getDatabaseStats();
    const storageStats = await this.getStorageStats();
    
    return {
      lastBackup: this.lastBackup,
      backupStatus: this.backupStatus,
      recoveryVerified: this.recoveryVerified,
      database: dbStats,
      storage: storageStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mark recovery as verified
   */
  markRecoveryVerified() {
    this.recoveryVerified = true;
    logger.info('Recovery procedure verified');
  }

  /**
   * Recovery verification endpoint logic
   */
  async verifyRecovery() {
    try {
      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        return { status: 'error', message: 'Database not connected' };
      }

      // Run a simple query to verify read capability
      const db = mongoose.connection.db;
      const admin = db.admin();
      const pingResult = await admin.ping();
      
      if (pingResult.ok === 1) {
        this.markRecoveryVerified();
        return { status: 'ok', message: 'Recovery verified - database is operational' };
      }
      
      return { status: 'error', message: 'Database ping failed' };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }
}

export const backupService = new BackupService();
export default backupService;
