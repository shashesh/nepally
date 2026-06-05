/**
 * Shared Promotion API functions
 * All Supabase query logic for listing promotions — accepts SupabaseClient via dependency injection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  PromotionResult,
  PromotionsResult,
  SponsoredListingsResult,
  SponsoredListing,
  CheckoutResult,
  PromotionAnalyticsResult,
} from '../types/promotion';
import type { CreatePromotionInput } from '../validation/promotion';

// Embeds are hinted by the FK column (listing_id) because PostgREST cannot
// look up base-table FK constraint names when selecting from a view.
const LISTING_SELECT_FOR_SPONSORED = `
  listing:marketplace_listings!listing_id (
    id, title, description, photos, price, category_id, listing_type,
    business_name, views_count, saves_count, contacts_count,
    trending_score, status, metro_area_id, refreshed_at, created_at,
    owner:users!marketplace_listings_owner_id_fkey (
      id, full_name, trust_level, profile_photo
    ),
    category:marketplace_categories!marketplace_listings_category_id_fkey (
      id, name, slug, emoji, icon, color
    )
  )
`;

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Check if a listing has any active promotion (used to disable "Promote" button).
 */
export async function getActivePromotionForListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<PromotionResult> {
  try {
    const { data, error } = await supabase
      .from('listing_promotions')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { data: data ?? undefined };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to check active promotion') };
  }
}

/**
 * Fetch a user's promotion history, newest first.
 */
export async function getPromotionsByUser(
  supabase: SupabaseClient,
  userId: string
): Promise<PromotionsResult> {
  try {
    const { data, error } = await supabase
      .from('listing_promotions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data ?? [] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch promotions') };
  }
}

/**
 * Fetch a single promotion by ID.
 */
export async function getPromotionById(
  supabase: SupabaseClient,
  promotionId: string
): Promise<PromotionResult> {
  try {
    const { data, error } = await supabase
      .from('listing_promotions')
      .select('*')
      .eq('id', promotionId)
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch promotion') };
  }
}

/**
 * Fetch listings with active `sponsored_feed` promotions for a metro area.
 * Used for home feed injection.
 */
export async function getSponsoredFeedListings(
  supabase: SupabaseClient,
  metroId: string,
  options: { limit?: number } = {}
): Promise<SponsoredListingsResult> {
  const { limit = 5 } = options;
  try {
    const { data, error } = await supabase
      .from('listing_promotions_display')
      .select(`id, promotion_type, ${LISTING_SELECT_FOR_SPONSORED}`)
      .eq('promotion_type', 'sponsored_feed')
      .order('created_at', { ascending: false })
      .filter('listing.metro_area_id', 'eq', metroId)
      .filter('listing.status', 'eq', 'active')
      .limit(limit);

    if (error) throw error;
    return { data: (data ?? []) as unknown as SponsoredListing[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch sponsored feed listings') };
  }
}

/**
 * Fetch listings with active `sticky_business` promotions for a metro area.
 * Used for the Sponsored Ads section on marketplace.
 */
export async function getStickyBusinessListings(
  supabase: SupabaseClient,
  metroId: string,
  options: { limit?: number } = {}
): Promise<SponsoredListingsResult> {
  const { limit = 5 } = options;
  try {
    const { data, error } = await supabase
      .from('listing_promotions_display')
      .select(`id, promotion_type, ${LISTING_SELECT_FOR_SPONSORED}`)
      .eq('promotion_type', 'sticky_business')
      .order('created_at', { ascending: false })
      .filter('listing.metro_area_id', 'eq', metroId)
      .filter('listing.status', 'eq', 'active')
      .limit(limit);

    if (error) throw error;
    return { data: (data ?? []) as unknown as SponsoredListing[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch sticky business listings') };
  }
}

// ─── Checkout ───────────────────────────────────────────────────────────────

/**
 * Call the `create-promotion-checkout` Edge Function.
 * Mobile: returns `{ clientSecret, publishableKey, promotionId }`
 * Web: returns `{ checkoutUrl, promotionId }`
 */
export async function createPromotionCheckout(
  supabaseUrl: string,
  authToken: string,
  anonKey: string,
  input: CreatePromotionInput,
  platform: 'mobile' | 'web'
): Promise<CheckoutResult> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-promotion-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ ...input, platform }),
      }
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `Checkout failed (${response.status})`);
    }

    const data = (await response.json()) as CheckoutResult['data'];
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to create promotion checkout') };
  }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

/**
 * Fetch promotion details plus views delta (current views - views_at_start).
 */
export async function getPromotionAnalytics(
  supabase: SupabaseClient,
  promotionId: string
): Promise<PromotionAnalyticsResult> {
  try {
    const { data: promotion, error: promoError } = await supabase
      .from('listing_promotions')
      .select('*')
      .eq('id', promotionId)
      .single();

    if (promoError) throw promoError;

    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .select('views_count')
      .eq('id', promotion.listing_id)
      .single();

    if (listingError) throw listingError;

    const currentViews = listing.views_count ?? 0;
    const viewsDelta = promotion.views_at_start != null
      ? currentViews - promotion.views_at_start
      : 0;

    return {
      data: {
        promotion,
        views_delta: viewsDelta,
        current_views: currentViews,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch promotion analytics') };
  }
}
