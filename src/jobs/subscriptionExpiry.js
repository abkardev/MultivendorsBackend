import Subscription from '../models/Subscription.js';

export async function run() {
  const now = new Date();
  const result = await Subscription.updateMany(
    { status: 'active', endDate: { $lt: now } },
    { status: 'expired' }
  );
  console.log(`[subscriptionExpiry] Expired ${result.modifiedCount} subscriptions`);

  // OPTIONAL: send renewal reminder for subs expiring in 14 days
  const reminderDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const expiringSoon = await Subscription.find({
    status: 'active',
    autoRenew: false,
    endDate: { $lt: reminderDate, $gt: now },
  }).populate('userId', 'email name');

  for (const sub of expiringSoon) {
    console.log(`[reminder] ${sub.userId.email} expires ${sub.endDate.toISOString()}`);
  }
}
