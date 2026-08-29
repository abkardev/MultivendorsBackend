import EscrowOrder from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { Vendor } from '../models/vendorModel.js';
import { notificationService } from '../services/notificationService.js';

async function escrowAutoRelease() {
  console.log('[CRON] Running escrow auto-release check...');

  try {
    const overdueOrders = await EscrowOrder.find({
      status: { $in: ['shipped', 'in_escrow'] },
      autoReleaseDate: { $lte: new Date() },
    });

    console.log(`[CRON] Found ${overdueOrders.length} orders eligible for auto-release`);

    for (const order of overdueOrders) {
      try {
        const vendorDoc = await Vendor.findById(order.vendor);
        if (!vendorDoc) continue;

        let wallet = await Wallet.findOne({ user: vendorDoc.user });
        if (!wallet) {
          wallet = await Wallet.create({ user: vendorDoc.user, currency: order.currency });
        }

        wallet.pendingBalance = Math.max(0, wallet.pendingBalance - order.totalAmount);
        wallet.availableBalance += order.totalAmount;
        await wallet.save();

        await Transaction.create({
          wallet: wallet._id,
          user: vendorDoc.user,
          type: 'escrow_release',
          amount: order.totalAmount,
          currency: order.currency,
          balance: wallet.availableBalance,
          reference: order._id.toString(),
          description: `Auto-release for order ${order.orderNumber} (buyer did not confirm)`,
        });

        order.status = 'completed';
        order.escrowReleasedAt = new Date();
        order.shipmentStatus = 'delivery_confirmed';
        order.deliveryConfirmedAt = new Date();
        order.timeline.push({
          event: 'Escrow Auto-Released',
          timestamp: new Date(),
          description: 'Funds auto-released after buyer did not confirm within escrow period',
        });
        await order.save();

        console.log(`[CRON] Auto-released order ${order.orderNumber}`);

        await notificationService.send({
          recipient: order.buyer,
          type: 'escrow_auto_released',
          title: { en: 'Escrow Auto-Released', ar: 'تم تحرير الضمان تلقائياً' },
          body: { en: `Funds for order #${order.orderNumber} have been auto-released as no confirmation was received within the escrow period.`, ar: `تم تحرير أموال الطلب #${order.orderNumber} تلقائياً لعدم استلام تأكيد خلال فترة الضمان.` },
          data: { orderId: order._id, orderNumber: order.orderNumber },
          channels: ['in_app', 'email'],
          link: `/orders/${order._id}`,
        });

        await notificationService.send({
          recipient: vendorDoc.user,
          type: 'escrow_auto_released',
          title: { en: 'Escrow Auto-Released', ar: 'تم تحرير الضمان تلقائياً' },
          body: { en: `Funds for order #${order.orderNumber} have been auto-released to your wallet.`, ar: `تم تحرير أموال الطلب #${order.orderNumber} تلقائياً إلى محفظتك.` },
          data: { orderId: order._id, orderNumber: order.orderNumber },
          channels: ['in_app', 'email'],
          link: `/orders/${order._id}`,
        });
      } catch (err) {
        console.error(`[CRON] Failed to auto-release order ${order._id}:`, err);
      }
    }
  } catch (error) {
    console.error('[CRON] Escrow auto-release error:', error);
  }
}

export default escrowAutoRelease;
