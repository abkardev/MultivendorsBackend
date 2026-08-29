/**
 * Single source of truth for plan definitions.
 * Mirror values with `src/lib/plans.ts` on the frontend.
 */
const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 1000, // USD/year
    commissionRate: 10,
    commissionLabel: '10%',
    stripePriceId: process.env.STRIPE_PRICE_STARTER, // create yearly price in Stripe dashboard
    features: {
      maxProducts: 25,
      storefront: 'basic',
      marketAccess: 'domestic',
      searchRanking: 'low',
      featuredPlacement: 'none',
      verifiedBadge: 'none',
      buyerMessaging: 'limited',
      fileSharing: false,
      dailyConversationLimit: 10,
      bulkOrderTools: 'none',
      promotions: 'none',
      analytics: 'basic',
      apiAccess: false,
      multiUserAccounts: false,
      adsTools: 'none',
      support: 'standard',
    },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 2000,
    commissionRate: 5,
    commissionLabel: '5%',
    stripePriceId: process.env.STRIPE_PRICE_GROWTH,
    features: {
      maxProducts: 100,
      storefront: 'advanced',
      marketAccess: 'domestic_international',
      searchRanking: 'medium',
      featuredPlacement: 'paid_addon',
      verifiedBadge: 'paid_addon',
      buyerMessaging: 'full',
      fileSharing: true,
      dailyConversationLimit: -1,
      bulkOrderTools: 'basic',
      promotions: 'basic',
      analytics: 'advanced',
      apiAccess: false,
      multiUserAccounts: false,
      adsTools: 'limited',
      support: 'priority',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 3000,
    commissionRate: 2.5,
    commissionLabel: '2-3%',
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    features: {
      maxProducts: -1,
      storefront: 'custom',
      marketAccess: 'global_priority',
      searchRanking: 'high',
      featuredPlacement: 'included',
      verifiedBadge: 'included',
      buyerMessaging: 'priority',
      fileSharing: true,
      dailyConversationLimit: -1,
      bulkOrderTools: 'advanced',
      promotions: 'advanced',
      analytics: 'full',
      apiAccess: true,
      multiUserAccounts: true,
      adsTools: 'full',
      support: 'vip',
    },
  },
};

const PLAN_IDS = Object.keys(PLANS);
export { PLANS, PLAN_IDS };
