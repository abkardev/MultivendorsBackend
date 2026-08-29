import { FraudReport } from '../models/FraudReport.js';
import { PaymentAudit } from '../models/PaymentAudit.js';

export class FraudEngine {
  async analyze(transaction) {
    const flags = [];
    if (transaction.amount > 100000) flags.push('high_value');
    if (transaction.amount > 50000 && !transaction.metadata?.verifiedBuyer) flags.push('high_value_unverified');
    if (!transaction.ipAddress) flags.push('no_ip');
    if (!transaction.userAgent) flags.push('no_user_agent');
    if (transaction.metadata?.rapidSuccessiveTx) flags.push('rapid_successive');
    if (transaction.metadata?.knownFraudIp) flags.push('known_fraud_ip');
    if (transaction.metadata?.countryMismatch) flags.push('country_mismatch');
    const riskScore = this._calculateRiskScore(flags, transaction.amount);
    const level = riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : riskScore < 80 ? 'high' : 'critical';
    const status = riskScore < 30 ? 'approved' : 'review';
    if (flags.length > 0) {
      await FraudReport.create({
        transaction: transaction._id, order: transaction.order, user: transaction.buyer,
        riskScore, level, status, flags, rules: flags,
        ipAddress: transaction.ipAddress, userAgent: transaction.userAgent,
        reason: `Risk score ${riskScore}% - ${flags.join(', ')}`,
      });
    }
    await PaymentAudit.create({
      action: 'fraud.analyze', actorRole: 'system', transaction: transaction._id, order: transaction.order,
      description: `Fraud analysis: risk ${riskScore}% (${level})`, changes: { riskScore, level, flags },
    });
    return { riskScore, level, flags, status, isBlocked: riskScore >= 80 };
  }

  _calculateRiskScore(flags, amount) {
    const weights = { high_value: 20, high_value_unverified: 30, no_ip: 15, no_user_agent: 10, rapid_successive: 40, known_fraud_ip: 50, country_mismatch: 25 };
    const baseScore = flags.reduce((sum, f) => sum + (weights[f] || 10), 0);
    const amountFactor = Math.min(amount / 100000, 1) * 20;
    return Math.min(baseScore + amountFactor, 100);
  }

  async listReports(filter = {}) {
    return FraudReport.find(filter).populate('transaction', 'transactionId amount').populate('user', 'name email').sort({ createdAt: -1 }).lean();
  }

  async reviewReport(reportId, reviewerId, status, note = '') {
    return FraudReport.findByIdAndUpdate(reportId, { status, reviewedBy: reviewerId, reviewedAt: new Date(), reason: note }, { new: true });
  }
}

export const fraudEngine = new FraudEngine();
