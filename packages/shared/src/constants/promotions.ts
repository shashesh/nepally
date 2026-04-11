/**
 * Promotion tier configurations, pricing, and limits
 */
import type { PromotionTierConfig } from '../types/promotion';

export const PROMOTION_TIERS: PromotionTierConfig[] = [
  {
    type: 'featured_listing',
    name: 'Featured Listing',
    description: 'Boost to top of marketplace search & category pages',
    daily_cost_cents: 199,
    benefits: [
      'Appear at the top of search results',
      'Featured badge on your listing',
      'Priority in category pages',
      'Get 5x more views',
    ],
    icon: 'star',
    color: '#FF9800',
  },
  {
    type: 'sponsored_feed',
    name: 'Sponsored Feed',
    description: 'Appear in the main Home Page scroll feed',
    daily_cost_cents: 299,
    benefits: [
      'Injected into the home feed for all local users',
      'Sponsored label badge',
      'Reach users who don\'t visit marketplace',
      'Get 10x more visibility',
    ],
    icon: 'megaphone',
    color: '#1565C0',
  },
  {
    type: 'sticky_business',
    name: 'Sticky Business',
    description: 'Fixed placement in Sponsored Ads section',
    daily_cost_cents: 499,
    benefits: [
      'Persistent visibility on every page load',
      'Premium placement in sidebar/header',
      'Maximum brand exposure',
      'Always-on advertising',
    ],
    icon: 'pin',
    color: '#DC143C',
  },
];

export const MIN_PROMOTION_DAYS = 1;
export const MAX_PROMOTION_DAYS = 90;
export const DEFAULT_PROMOTION_DAYS = 7;
export const SPONSORED_FEED_INJECTION_INTERVAL = 10;
