import crypto from 'crypto';
import LedgerEntry from '../models/LedgerEntry.js';
import Wallet from '../models/Wallet.js';

export async function createLedgerEntry(data) {
  const entryId = `LGR-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const netAmount = data.amount - (data.fee || 0);
  const entry = await LedgerEntry.create({
    ...data,
    entryId,
    netAmount,
  });
  await syncWalletBalance(data.userId);
  return entry;
}

export async function syncWalletBalance(userId) {
  const entries = await LedgerEntry.find({ userId, status: 'completed' });
  let balance = 0;
  let pendingBalance = 0;
  for (const entry of entries) {
    const sign = getAmountSign(entry.type);
    balance += sign * entry.netAmount;
    if (entry.type === 'escrow_hold') {
      pendingBalance += entry.netAmount;
    }
  }
  await Wallet.updateOne(
    { user: userId },
    { $set: { availableBalance: balance, pendingBalance } },
    { upsert: true }
  );
  return { balance, pendingBalance };
}

function getAmountSign(type) {
  const credits = ['payment_received', 'deposit', 'escrow_release', 'refund', 'bonus'];
  const debits = ['payment_sent', 'withdrawal', 'escrow_hold', 'commission', 'fee', 'subscription', 'penalty'];
  if (credits.includes(type)) return 1;
  if (debits.includes(type)) return -1;
  return 0;
}

export async function getUserStatement(userId, { startDate, endDate, page = 1, limit = 50 }) {
  const query = { userId };
  if (startDate) query.createdAt = { $gte: new Date(startDate) };
  if (endDate) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$lte = new Date(endDate);
  }
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    LedgerEntry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LedgerEntry.countDocuments(query),
  ]);
  return {
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
