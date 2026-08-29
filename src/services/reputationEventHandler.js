import { reputationScheduler } from '../schedulers/reputationScheduler.js';
import { reputationCache } from './reputationCache.js';
import { getLogger } from './logger.js';
import { isFeatureEnabled } from './featureFlagService.js';
import { notificationService } from './notificationService.js';
import VendorReputation from '../models/VendorReputation.js';
import BuyerReputation from '../models/BuyerReputation.js';
import VendorBadge from '../models/VendorBadge.js';

const logger = getLogger('reputation');

export async function handleReputationEvent(eventType, data) {
  try {
    const autoRecalc = await isFeatureEnabled('reputationAutoRecalculation');
    const badgeSystem = await isFeatureEnabled('reputationBadgeSystem');

    switch (eventType) {
      case 'order.completed':
      case 'order.delivered': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
          reputationCache.invalidateVendor(data.vendorId);
        }
        if (data.userId) {
          reputationScheduler.queueBuyerRecalculation(data.userId);
          reputationCache.invalidateBuyer(data.userId);
        }
        break;
      }

      case 'shipment.delivered': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
          reputationCache.invalidateVendor(data.vendorId);
        }
        break;
      }

      case 'review.approved': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
          reputationCache.invalidateVendor(data.vendorId);
        }
        if (data.userId) {
          reputationScheduler.queueBuyerRecalculation(data.userId);
          reputationCache.invalidateBuyer(data.userId);
        }
        break;
      }

      case 'dispute.resolved':
      case 'dispute.closed': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
          reputationCache.invalidateVendor(data.vendorId);
        }
        if (data.userId) {
          reputationScheduler.queueBuyerRecalculation(data.userId);
          reputationCache.invalidateBuyer(data.userId);
        }
        break;
      }

      case 'verification.approved': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
          reputationCache.invalidateVendor(data.vendorId);
        }
        break;
      }

      case 'badge.earned':
      case 'badge.revoked': {
        if (data.vendorId) {
          reputationCache.invalidateVendor(data.vendorId);
        }
        break;
      }

      case 'payment.completed': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
        }
        break;
      }

      case 'refund.completed': {
        if (data.vendorId) {
          reputationScheduler.queueVendorRecalculation(data.vendorId);
        }
        if (data.userId) {
          reputationScheduler.queueBuyerRecalculation(data.userId);
        }
        break;
      }
    }
  } catch (err) {
    logger.error({ err, eventType, data }, 'Reputation event handler error');
  }
}

export async function notifyReputationChange(entityType, entityId, oldScore, newScore) {
  try {
    const diff = newScore - oldScore;
    const isIncrease = diff > 0;
    const significant = Math.abs(diff) >= 5;

    if (!significant) return;

    let recipient;
    if (entityType === 'vendor') {
      const rep = await VendorReputation.findOne({ vendor: entityId }).populate('vendor', 'user').lean();
      recipient = rep?.vendor?.user;
    } else if (entityType === 'buyer') {
      recipient = entityId;
    }

    if (!recipient) return;

    await notificationService.send({
      recipient,
      type: isIncrease ? 'reputation_increased' : 'reputation_decreased',
      title: isIncrease ? 'Reputation Score Increased' : 'Reputation Score Decreased',
      body: isIncrease
        ? `Your reputation score increased by ${Math.abs(diff)} points to ${newScore}`
        : `Your reputation score decreased by ${Math.abs(diff)} points to ${newScore}`,
      data: { oldScore, newScore, diff, entityType },
      channels: ['in_app'],
      priority: 'medium',
      link: entityType === 'vendor' ? '/vendor/reputation' : '/dashboard',
    });
  } catch (err) {
    logger.error({ err, entityType, entityId }, 'Failed to send reputation notification');
  }
}

export async function checkAndNotifyBadges(vendorId) {
  try {
    const recentBadges = await VendorBadge.find({
      vendor: vendorId,
      awardedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      awardedBy: 'auto',
    }).lean();

    for (const badge of recentBadges) {
      const rep = await VendorReputation.findOne({ vendor: vendorId }).populate('vendor', 'user').lean();
      if (rep?.vendor?.user) {
        await notificationService.send({
          recipient: rep.vendor.user,
          type: 'badge_earned',
          title: 'New Badge Earned!',
          body: `Congratulations! You earned the ${badge.badge.replace(/_/g, ' ')} badge.`,
          data: { badge: badge.badge },
          channels: ['in_app'],
          priority: 'high',
          link: '/vendor/reputation',
        });
      }
    }
  } catch (err) {
    logger.error({ err, vendorId }, 'Failed to check badge notifications');
  }
}
