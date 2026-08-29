import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { EnterpriseLicense } from '../models/EnterpriseLicense.js';
import { LicenseActivation } from '../models/LicenseActivation.js';
import { LicenseSeat } from '../models/LicenseSeat.js';
import { LicenseUsage } from '../models/LicenseUsage.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class LicensingService {
  async createLicense(data) {
    const licenseKey = `LICS-${uuidv4().toUpperCase().replace(/-/g, '').slice(0, 24)}`;
    const payload = `${licenseKey}:${data.type}:${data.tenant || ''}:${data.maxSeats || 0}`;
    const signature = crypto.createHmac('sha256', 'internal-signing-key-placeholder').update(payload).digest('hex');
    const license = await EnterpriseLicense.create({
      ...data,
      licenseKey,
      signature,
      signedBy: 'internal',
    });
    await logAuditEvent({
      action: 'licensing.license.create', category: 'licensing',
      entityType: 'EnterpriseLicense', entityId: license._id,
      newValue: { licenseKey, type: license.type, tenant: license.tenant },
      description: `License ${licenseKey} created (${license.type})`,
    });
    return license;
  }

  async activateLicense(licenseKey, activationData) {
    const license = await EnterpriseLicense.findOne({ licenseKey });
    if (!license) throw new Error('License not found');
    if (license.status !== 'active') throw new Error(`License is ${license.status}`);
    if (license.endDate && new Date(license.endDate) < new Date()) throw new Error('License has expired');
    const activeCount = await LicenseActivation.countDocuments({ license: license._id, status: 'active' });
    if (activeCount >= (license.activationLimit || 10)) throw new Error('Activation limit reached');
    const activationCode = uuidv4();
    const activation = await LicenseActivation.create({
      license: license._id,
      activationCode,
      method: 'online',
      deviceId: activationData.deviceId,
      deviceName: activationData.deviceName,
      deviceInfo: activationData.deviceInfo,
      activatedBy: activationData.activatedBy,
    });
    license.lastValidated = new Date();
    license.validationCount = (license.validationCount || 0) + 1;
    await license.save();
    await logAuditEvent({
      action: 'licensing.license.activate', category: 'licensing',
      entityType: 'LicenseActivation', entityId: activation._id,
      newValue: { licenseKey, deviceId: activationData.deviceId, method: 'online' },
      description: `License ${licenseKey} activated on ${activationData.deviceName || activationData.deviceId}`,
    });
    return activation;
  }

  async offlineActivation(licenseKey, activationCode) {
    const license = await EnterpriseLicense.findOne({ licenseKey });
    if (!license) throw new Error('License not found');
    const expectedCode = this.generateActivationCode(licenseKey, activationCode.split(':')[1] || 'unknown');
    if (activationCode !== expectedCode) throw new Error('Invalid activation code');
    const activation = await LicenseActivation.create({
      license: license._id,
      activationCode: uuidv4(),
      method: 'offline',
      deviceId: activationCode.split(':')[1] || 'unknown',
      status: 'active',
    });
    await logAuditEvent({
      action: 'licensing.license.offline_activate', category: 'licensing',
      entityType: 'LicenseActivation', entityId: activation._id,
      newValue: { licenseKey, method: 'offline' },
      description: `License ${licenseKey} activated offline`,
    });
    return activation;
  }

  async validateLicense(licenseKey) {
    const license = await EnterpriseLicense.findOne({ licenseKey }).lean();
    if (!license) return { valid: false, status: 'not_found', reason: 'License not found' };
    const now = new Date();
    const result = {
      valid: false,
      licenseKey: license.licenseKey,
      type: license.type,
      status: license.status,
      expiresAt: license.endDate,
    };
    if (license.status === 'revoked') {
      result.reason = 'License has been revoked';
      return result;
    }
    if (license.status === 'suspended') {
      result.reason = 'License is suspended';
      return result;
    }
    if (license.gracePeriodEnd && now <= new Date(license.gracePeriodEnd)) {
      result.valid = true;
      result.inGracePeriod = true;
      result.reason = 'License is in grace period';
      result.graceEndsAt = license.gracePeriodEnd;
      return result;
    }
    if (license.endDate && now > new Date(license.endDate)) {
      result.status = 'expired';
      result.reason = 'License has expired';
      return result;
    }
    result.valid = true;
    result.reason = 'License is valid';
    await EnterpriseLicense.findByIdAndUpdate(license._id, {
      $set: { lastValidated: new Date() },
      $inc: { validationCount: 1 },
    });
    return result;
  }

  async deactivateLicense(activationId) {
    const activation = await LicenseActivation.findByIdAndUpdate(activationId, {
      $set: { status: 'deactivated', deactivatedAt: new Date() },
    }, { new: true });
    if (!activation) throw new Error('Activation not found');
    await logAuditEvent({
      action: 'licensing.license.deactivate', category: 'licensing',
      entityType: 'LicenseActivation', entityId: activationId,
      description: `Device ${activation.deviceName || activation.deviceId} deactivated`,
    });
    return activation;
  }

  async revokeLicense(licenseId) {
    const license = await EnterpriseLicense.findByIdAndUpdate(licenseId, {
      $set: { status: 'revoked' },
    }, { new: true });
    if (!license) throw new Error('License not found');
    await LicenseActivation.updateMany(
      { license: licenseId, status: 'active' },
      { $set: { status: 'deactivated', deactivatedAt: new Date() } }
    );
    await LicenseSeat.updateMany(
      { license: licenseId, status: 'active' },
      { $set: { status: 'removed' } }
    );
    await logAuditEvent({
      action: 'licensing.license.revoke', category: 'licensing',
      entityType: 'EnterpriseLicense', entityId: licenseId,
      newValue: { licenseKey: license.licenseKey },
      description: `License ${license.licenseKey} revoked`,
    });
    return license;
  }

  async listLicenses(filter = {}) {
    const { page = 1, limit = 20, status, type, tenant, search } = filter;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (tenant) query.tenant = tenant;
    if (search) query.$or = [
      { licenseKey: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      EnterpriseLicense.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      EnterpriseLicense.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getLicense(id) {
    const license = await EnterpriseLicense.findById(id).lean();
    if (!license) throw new Error('License not found');
    const [activations, seats] = await Promise.all([
      LicenseActivation.find({ license: id }).sort({ createdAt: -1 }).lean(),
      LicenseSeat.find({ license: id }).sort({ assignedAt: -1 }).lean(),
    ]);
    return { ...license, activations, seats };
  }

  async addSeat(licenseId, seatData) {
    const license = await EnterpriseLicense.findById(licenseId);
    if (!license) throw new Error('License not found');
    const activeSeats = await LicenseSeat.countDocuments({ license: licenseId, status: 'active' });
    if (license.maxSeats && activeSeats >= license.maxSeats) throw new Error('Seat limit reached');
    const seat = await LicenseSeat.create({ ...seatData, license: licenseId });
    await logAuditEvent({
      action: 'licensing.seat.add', category: 'licensing',
      entityType: 'LicenseSeat', entityId: seat._id,
      newValue: { licenseId, email: seat.email, seatType: seat.seatType },
      description: `Seat added for ${seat.email || seat.user}`,
    });
    return seat;
  }

  async removeSeat(seatId) {
    const seat = await LicenseSeat.findByIdAndUpdate(seatId, { $set: { status: 'removed' } }, { new: true });
    if (!seat) throw new Error('Seat not found');
    await logAuditEvent({
      action: 'licensing.seat.remove', category: 'licensing',
      entityType: 'LicenseSeat', entityId: seatId,
      oldValue: { email: seat.email, seatType: seat.seatType },
      description: `Seat ${seat.email || seatId} removed`,
    });
    return seat;
  }

  async listSeats(licenseId) {
    return LicenseSeat.find({ license: licenseId }).sort({ assignedAt: -1 }).lean();
  }

  async recordUsage(licenseId, usageData) {
    const license = await EnterpriseLicense.findById(licenseId);
    if (!license) throw new Error('License not found');
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodEnd = new Date(periodStart.getTime() + 86400000);
    const usage = await LicenseUsage.findOneAndUpdate(
      { license: licenseId, period: 'daily', periodStart },
      {
        $set: { periodEnd },
        $inc: {
          apiCalls: usageData.apiCalls || 0,
          storageUsed: usageData.storageUsed || 0,
          aiTokens: usageData.aiTokens || 0,
          activeDevices: usageData.activeDevices || 0,
          activeSeats: usageData.activeSeats || 0,
          totalSeats: usageData.totalSeats || 0,
        },
      },
      { upsert: true, new: true }
    );
    return usage;
  }

  async getUsage(licenseId, period = 'monthly') {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return LicenseUsage.find({
      license: licenseId,
      period,
      periodStart: { $gte: periodStart },
    }).sort({ periodStart: -1 }).lean();
  }

  async checkFeatureEntitlement(licenseKey, feature) {
    const license = await EnterpriseLicense.findOne({ licenseKey }).lean();
    if (!license) return { entitled: false, reason: 'License not found' };
    if (license.status !== 'active') return { entitled: false, reason: `License is ${license.status}` };
    if (license.endDate && new Date(license.endDate) < new Date()) {
      return { entitled: false, reason: 'License expired' };
    }
    const entitled = license.features && license.features.includes(feature);
    return { entitled, feature, licenseKey, reason: entitled ? 'Feature available' : 'Feature not included' };
  }

  async renewLicense(licenseId) {
    const license = await EnterpriseLicense.findById(licenseId);
    if (!license) throw new Error('License not found');
    const now = new Date();
    const currentEnd = license.endDate || now;
    const newEnd = new Date(Math.max(currentEnd.getTime(), now.getTime()) + 365 * 86400000);
    license.endDate = newEnd;
    license.status = 'active';
    if (license.gracePeriodEnd) license.gracePeriodEnd = null;
    await license.save();
    await logAuditEvent({
      action: 'licensing.license.renew', category: 'licensing',
      entityType: 'EnterpriseLicense', entityId: licenseId,
      newValue: { endDate: newEnd, licenseKey: license.licenseKey },
      description: `License ${license.licenseKey} renewed to ${newEnd.toISOString()}`,
    });
    return license;
  }

  async transferLicense(licenseId, newTenantId) {
    const license = await EnterpriseLicense.findByIdAndUpdate(licenseId, {
      $set: { tenant: newTenantId },
    }, { new: true });
    if (!license) throw new Error('License not found');
    await LicenseActivation.updateMany(
      { license: licenseId, status: 'active' },
      { $set: { status: 'deactivated', deactivatedAt: new Date() } }
    );
    await logAuditEvent({
      action: 'licensing.license.transfer', category: 'licensing',
      entityType: 'EnterpriseLicense', entityId: licenseId,
      newValue: { tenant: newTenantId, licenseKey: license.licenseKey },
      description: `License ${license.licenseKey} transferred to tenant ${newTenantId}`,
    });
    return license;
  }

  async getLicenseSummary(licenseId) {
    const license = await EnterpriseLicense.findById(licenseId).lean();
    if (!license) throw new Error('License not found');
    const [activeActivations, activeSeats, totalSeats, usage] = await Promise.all([
      LicenseActivation.countDocuments({ license: licenseId, status: 'active' }),
      LicenseSeat.countDocuments({ license: licenseId, status: 'active' }),
      LicenseSeat.countDocuments({ license: licenseId }),
      LicenseUsage.find({ license: licenseId }).sort({ periodStart: -1 }).limit(12).lean(),
    ]);
    return {
      license,
      activations: { active: activeActivations, limit: license.activationLimit || 10 },
      seats: { active: activeSeats, total: totalSeats, max: license.maxSeats },
      recentUsage: usage,
    };
  }

  async expireLicenses() {
    const now = new Date();
    const result = await EnterpriseLicense.updateMany(
      { status: 'active', endDate: { $lte: now } },
      { $set: { status: 'expired' } }
    );
    logger.info(`Expired ${result.modifiedCount} licenses`);
    return { modifiedCount: result.modifiedCount };
  }

  async validateAllLicenses() {
    const licenses = await EnterpriseLicense.find({ status: 'active' }).lean();
    const now = new Date();
    let expired = 0;
    let valid = 0;
    for (const license of licenses) {
      if (license.endDate && now > new Date(license.endDate)) {
        await EnterpriseLicense.findByIdAndUpdate(license._id, { $set: { status: 'expired' } });
        expired++;
      } else {
        valid++;
      }
    }
    logger.info(`Validation complete: ${valid} valid, ${expired} expired`);
    return { total: licenses.length, valid, expired };
  }

  generateActivationCode(licenseKey, deviceId) {
    const hash = crypto.createHash('sha256').update(`${licenseKey}:${deviceId}:offline-secret-salt`).digest('hex');
    return `${licenseKey}:${deviceId}:${hash.slice(0, 16)}`;
  }
}

export const licensingService = new LicensingService();
