/**
 * Promotion domain types — snake_case matching Supabase database columns
 * See: supabase/migrations/020_promotions.sql
 */
import type { MarketplaceListing } from './marketplace';

export type PromotionType = 'featured_listing' | 'sponsored_feed' | 'sticky_business';
export type PromotionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface ListingPromotion {
  id: string;
  listing_id: string;
  user_id: string;
  promotion_type: PromotionType;
  status: PromotionStatus;
  duration_days: number;
  daily_cost_cents: number;
  total_cost_cents: number;
  start_date: string | null;
  end_date: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  views_at_start: number | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionTierConfig {
  type: PromotionType;
  name: string;
  description: string;
  daily_cost_cents: number;
  benefits: string[];
  icon: string;
  color: string;
}

export interface SponsoredListing {
  id: string;
  promotion_type: PromotionType;
  listing: MarketplaceListing;
}

/** Result types for promotion API functions */
export interface PromotionResult {
  data?: ListingPromotion;
  error?: Error;
}

export interface PromotionsResult {
  data?: ListingPromotion[];
  error?: Error;
}

export interface SponsoredListingsResult {
  data?: SponsoredListing[];
  error?: Error;
}

export interface CheckoutResult {
  data?: {
    promotionId: string;
    clientSecret?: string;
    publishableKey?: string;
    checkoutUrl?: string;
  };
  error?: Error;
}

export interface PromotionAnalytics {
  promotion: ListingPromotion;
  views_delta: number;
  current_views: number;
}

export interface PromotionAnalyticsResult {
  data?: PromotionAnalytics;
  error?: Error;
}
