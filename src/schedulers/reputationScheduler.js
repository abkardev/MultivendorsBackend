import cron from 'node-cron';
import VendorReputation from '../models/VendorReputation.js';
import BuyerReputation from '../models/BuyerReputation.js';
import { calculateVendorReputation } from '../services/vendorReputationService.js';
import { calculateBuyerReputation } from '../services/buyerReputationService.js';
import { Vendor } from '../models/vendorModel.js';
import User from '../models/userModel.js';
import { getLogger } from '../services/logger.js';

const logger = getLogger('jobs');

class ReputationScheduler {
  constructor() {
    this.isRunning = false;
    this.queue = [];
    this.processing = false;
    this.stats = {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      lastRun: null,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
    };
  }

  initialize() {
    cron.schedule('0 */6 * * *', () => this.scheduledRecalculation());
    cron.schedule('30 */6 * * *', () => this.scheduledBuyerRecalculation());
    cron.schedule('0 0 * * *', () => this.fullRefresh());
    logger.info('Reputation scheduler initialized (every 6 hours + midnight full refresh)');
  }

  queueVendorRecalculation(vendorId) {
    if (!this.queue.some(item => item.type === 'vendor' && item.id === vendorId)) {
      this.queue.push({ type: 'vendor', id: vendorId });
      logger.debug({ vendorId }, 'Queued vendor reputation recalculation');
    }
    this.processQueue();
  }

  queueBuyerRecalculation(userId) {
    if (!this.queue.some(item => item.type === 'buyer' && item.id === userId)) {
      this.queue.push({ type: 'buyer', id: userId });
      logger.debug({ userId }, 'Queued buyer reputation recalculation');
    }
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      try {
        const start = Date.now();

        if (item.type === 'vendor') {
          await calculateVendorReputation(item.id);
        } else if (item.type === 'buyer') {
          await calculateBuyerReputation(item.id);
        }

        const duration = Date.now() - start;
        this.stats.totalCalculations++;
        this.stats.successfulCalculations++;
        this.stats.totalExecutionTime += duration;
        this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.totalCalculations;

        logger.debug({ type: item.type, id: item.id, duration }, 'Reputation calculated');
      } catch (err) {
        this.stats.totalCalculations++;
        this.stats.failedCalculations++;
        logger.error({ err, type: item.type, id: item.id }, 'Reputation calculation failed');
      }
    }

    this.processing = false;
  }

  async scheduledRecalculation() {
    if (this.isRunning) {
      logger.warn('Scheduled reputation recalculation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const start = Date.now();
    logger.info('Starting scheduled vendor reputation recalculation');

    try {
      const vendors = await VendorReputation.find({}).select('vendor').lean();

      for (const v of vendors) {
        this.queueVendorRecalculation(v.vendor);
      }

      const allVendors = await Vendor.find({ isActive: true }).select('_id').lean();
      const existingIds = new Set(vendors.map(v => v.vendor.toString()));
      for (const v of allVendors) {
        if (!existingIds.has(v._id.toString())) {
          this.queueVendorRecalculation(v._id);
        }
      }

      const duration = Date.now() - start;
      this.stats.lastRun = new Date();
      logger.info({ vendorCount: this.queue.length, duration }, 'Scheduled vendor reputation queued');

      this.processQueue();
    } catch (err) {
      logger.error({ err }, 'Scheduled vendor reputation recalculation failed');
    } finally {
      this.isRunning = false;
    }
  }

  async scheduledBuyerRecalculation() {
    const start = Date.now();
    logger.info('Starting scheduled buyer reputation recalculation');

    try {
      const buyers = await BuyerReputation.find({}).select('user').lean();
      const allUsers = await User.find({ role: { $in: ['user', 'buyer', 'vendor'] }, isActive: true }).select('_id').lean();
      const existingIds = new Set(buyers.map(b => b.user.toString()));

      for (const u of allUsers) {
        this.queueBuyerRecalculation(u._id);
      }

      const duration = Date.now() - start;
      logger.info({ buyerCount: this.queue.length, duration }, 'Buyer reputation calculations queued');

      this.processQueue();
    } catch (err) {
      logger.error({ err }, 'Scheduled buyer reputation recalculation failed');
    }
  }

  async fullRefresh() {
    logger.info('Starting full reputation refresh');
    await this.scheduledRecalculation();
    await this.scheduledBuyerRecalculation();
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      isProcessing: this.processing,
      isRunning: this.isRunning,
    };
  }
}

export const reputationScheduler = new ReputationScheduler();
