// import Stripe from 'stripe';
// import Subscription from '../models/Subscription.js';
// import WebhookLog from '../models/webhookLogModel.js';
// import { PLANS } from '../config/plans.js';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

// /**
//  * Mount with raw body parser:
//  *   app.post('/api/subscription/webhook',
//  *     express.raw({ type: 'application/json' }),
//  *     subscriptionWebhook);
//  */
// export default async function subscriptionWebhook(req, res) {
//   let event;
//   try {
//     const sig = req.headers['stripe-signature'];
//     event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
//   } catch (err) {
//     console.error('Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     const existing = await WebhookLog.findOne({ webhookId: event.id });
//     const webhookLog = existing || await WebhookLog.create({
//       webhookId: event.id,
//       provider: 'stripe',
//       event: event.type,
//       payload: event,
//       status: 'received',
//       ip: req.ip,
//     });
//     if (existing) {
//       // Replay of a previously processed subscription event — idempotent no-op.
//       return res.json({ received: true, duplicate: true });
//     }

//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object;
//         if (session.mode !== 'subscription') break;
//         const userId = session.metadata?.userId;
//         const planType = session.metadata?.planType;
//         if (!userId || !planType || !PLANS[planType]) break;

//         const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
//         await activateSubscription({
//           userId,
//           planType,
//           stripeSubscriptionId: stripeSub.id,
//           stripeCustomerId: stripeSub.customer,
//           currentPeriodEnd: stripeSub.current_period_end,
//         });
//         break;
//       }
//       case 'customer.subscription.updated': {
//         const stripeSub = event.data.object;
//         const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSub.id });
//         if (sub) {
//           sub.status = stripeSub.status === 'active' ? 'active' :
//                        stripeSub.status === 'past_due' ? 'past_due' :
//                        stripeSub.status === 'canceled' ? 'canceled' : sub.status;
//           sub.endDate = new Date(stripeSub.current_period_end * 1000);
//           sub.autoRenew = !stripeSub.cancel_at_period_end;
//           await sub.save();
//         }
//         break;
//       }
//       case 'customer.subscription.deleted': {
//         const stripeSub = event.data.object;
//         await Subscription.updateOne(
//           { stripeSubscriptionId: stripeSub.id },
//           { status: 'canceled', canceledAt: new Date(), autoRenew: false }
//         );
//         break;
//       }
//       case 'invoice.payment_failed': {
//         const invoice = event.data.object;
//         if (invoice.subscription) {
//           await Subscription.updateOne(
//             { stripeSubscriptionId: invoice.subscription },
//             { status: 'past_due' }
//           );
//         }
//         break;
//       }
//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object;
//         if (invoice.subscription) {
//           const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
//           await Subscription.updateOne(
//             { stripeSubscriptionId: stripeSub.id },
//             {
//               status: 'active',
//               endDate: new Date(stripeSub.current_period_end * 1000),
//             }
//           );
//         }
//         break;
//       }
//       default:
//         // ignore other events
//         break;
//     }
//     await WebhookLog.updateOne({ _id: webhookLog._id }, { status: 'processed', processedAt: new Date() }).catch(() => {});
//     res.json({ received: true });
//   } catch (err) {
//     console.error('Webhook handler error:', err);
//     res.status(500).json({ error: err.message });
//   }
// };

// async function activateSubscription({ userId, planType, stripeSubscriptionId, stripeCustomerId, currentPeriodEnd }) {
//   const plan = PLANS[planType];
//   // Cancel any prior active subs for this user
//   await Subscription.updateMany(
//     { userId, status: 'active' },
//     { status: 'canceled', canceledAt: new Date() }
//   );
//   await Subscription.create({
//     userId,
//     planType,
//     status: 'active',
//     startDate: new Date(),
//     endDate: new Date(currentPeriodEnd * 1000),
//     commissionRate: plan.commissionRate,
//     features: plan.features,
//     stripeSubscriptionId,
//     stripeCustomerId,
//     autoRenew: true,
//   });
// }

import Stripe from 'stripe';
import Subscription from '../models/Subscription.js';
import WebhookLog from '../models/webhookLogModel.js';
import { PLANS } from '../config/plans.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

/**
 * Mount with raw body parser:
 *   app.post('/api/subscription/webhook',
 *     express.raw({ type: 'application/json' }),
 *     subscriptionWebhook);
 */
export default async function subscriptionWebhook(req, res) {
  // Stripe subscriptions are disabled when no Stripe credentials are configured.
  if (!stripe || !WEBHOOK_SECRET) {
    return res.status(503).json({
      error: 'Stripe subscriptions are disabled'
    });
  }

  let event;

  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const existing = await WebhookLog.findOne({ webhookId: event.id });

    const webhookLog =
      existing ||
      await WebhookLog.create({
        webhookId: event.id,
        provider: 'stripe',
        event: event.type,
        payload: event,
        status: 'received',
        ip: req.ip,
      });

    if (existing) {
      // Replay of a previously processed subscription event — idempotent no-op.
      return res.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.userId;
        const planType = session.metadata?.planType;

        if (!userId || !planType || !PLANS[planType]) break;

        const stripeSub = await stripe.subscriptions.retrieve(
          session.subscription
        );

        await activateSubscription({
          userId,
          planType,
          stripeSubscriptionId: stripeSub.id,
          stripeCustomerId: stripeSub.customer,
          currentPeriodEnd: stripeSub.current_period_end,
        });

        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;

        const sub = await Subscription.findOne({
          stripeSubscriptionId: stripeSub.id
        });

        if (sub) {
          sub.status =
            stripeSub.status === 'active' ? 'active' :
            stripeSub.status === 'past_due' ? 'past_due' :
            stripeSub.status === 'canceled' ? 'canceled' :
            sub.status;

          sub.endDate = new Date(
            stripeSub.current_period_end * 1000
          );

          sub.autoRenew = !stripeSub.cancel_at_period_end;

          await sub.save();
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;

        await Subscription.updateOne(
          { stripeSubscriptionId: stripeSub.id },
          {
            status: 'canceled',
            canceledAt: new Date(),
            autoRenew: false
          }
        );

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        if (invoice.subscription) {
          await Subscription.updateOne(
            { stripeSubscriptionId: invoice.subscription },
            { status: 'past_due' }
          );
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;

        if (invoice.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(
            invoice.subscription
          );

          await Subscription.updateOne(
            { stripeSubscriptionId: stripeSub.id },
            {
              status: 'active',
              endDate: new Date(
                stripeSub.current_period_end * 1000
              ),
            }
          );
        }

        break;
      }

      default:
        // Ignore other events.
        break;
    }

    await WebhookLog.updateOne(
      { _id: webhookLog._id },
      {
        status: 'processed',
        processedAt: new Date()
      }
    ).catch(() => {});

    res.json({ received: true });

  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function activateSubscription({
  userId,
  planType,
  stripeSubscriptionId,
  stripeCustomerId,
  currentPeriodEnd
}) {
  const plan = PLANS[planType];

  // Cancel any prior active subscriptions for this user.
  await Subscription.updateMany(
    { userId, status: 'active' },
    {
      status: 'canceled',
      canceledAt: new Date()
    }
  );

  await Subscription.create({
    userId,
    planType,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(currentPeriodEnd * 1000),
    commissionRate: plan.commissionRate,
    features: plan.features,
    stripeSubscriptionId,
    stripeCustomerId,
    autoRenew: true,
  });
}

