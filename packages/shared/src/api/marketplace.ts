/**
 * Shared Marketplace API functions
 * All Supabase query logic for marketplace listings — accepts SupabaseClient via dependency injection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  MarketplaceListing,
  MarketplaceCategory,
  ListingResult,
  ListingsResult,
  CategoriesResult,
  SavedListingsResult,
  ListingSortBy,
} from '../types/marketplace';
import type { CreateListingInput, UpdateListingInput } from '../validation/marketplace';

const OWNER_SELECT = `
  owner:users!marketplace_listings_owner_id_fkey (
    id,
    full_name,
    trust_level,
    profile_photo
  )
`;

const CATEGORY_SELECT = `
  category:marketplace_categories!marketplace_listings_category_id_fkey (
    id,
    name,
    slug,
    emoji,
    icon,
    color
  )
`;

export const LISTING_SELECT = `*, ${OWNER_SELECT}, ${CATEGORY_SELECT}`;

// ─── Categories ─────────────────────────────────────────────────────────────

/**
 * Fetch all marketplace categories sorted by sort_order.
 */
export async function getCategories(
  supabase: SupabaseClient
): Promise<CategoriesResult> {
  try {
    const { data, error } = await supabase
      .from('marketplace_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as MarketplaceCategory[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch categories') };
  }
}

// ─── Listings: Read ─────────────────────────────────────────────────────────

export interface ListingFilters {
  categorySlug?: string;
  searchQuery?: string;
  sortBy?: ListingSortBy;
  limit?: number;
  offset?: number;
}

/**
 * Apply a `sortBy` value to a Supabase query builder.
 *
 * NOTE: `price` is a TEXT column (e.g., "$15-25", "Negotiable"), so price sort is
 * lexicographic for MVP. Follow-up: add a `price_cents INTEGER` column + migration
 * parsing `price` into cents, then sort on that.
 */
function applySortBy<T extends { order: (col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => T }>(
  query: T,
  sortBy: ListingSortBy
): T {
  switch (sortBy) {
    case 'oldest':
      return query.order('refreshed_at', { ascending: true });
    case 'featured':
      return query
        .order('is_featured', { ascending: false })
        .order('refreshed_at', { ascending: false });
    case 'price_asc':
      return query.order('price', { ascending: true, nullsFirst: false });
    case 'price_desc':
      return query.order('price', { ascending: false, nullsFirst: false });
    case 'newest':
    default:
      return query.order('refreshed_at', { ascending: false });
  }
}

/**
 * Get active listings for a metro area, ordered by refreshed_at (fresh first) by default.
 * Supports category filtering, full-text search, and configurable sort.
 */
export async function getListingsByMetro(
  supabase: SupabaseClient,
  metroId: string,
  filters: ListingFilters = {}
): Promise<ListingsResult> {
  try {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    const sortBy: ListingSortBy = filters.sortBy ?? 'newest';

    let query = supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId);

    query = applySortBy(query, sortBy).range(offset, offset + limit - 1);

    // Filter by category slug (requires a join filter)
    if (filters.categorySlug) {
      query = query.eq('category.slug', filters.categorySlug);
    }

    // Full-text search on title + description (uses generated search_vector column + GIN index)
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      query = query.textSearch('search_vector', filters.searchQuery.trim(), { type: 'websearch' });
    }

    const { data, error } = await query;

    if (error) throw error;

    // `hasMore` is derived from the raw page size BEFORE the client-side
    // category filter below, so pagination still advances when a page
    // filters down to zero matches.
    const rawRows = (data || []) as MarketplaceListing[];
    const hasMore = rawRows.length === limit;

    // If filtering by category slug via nested filter, Supabase may return rows
    // where category is null (no match). Filter those client-side.
    let listings = rawRows;
    if (filters.categorySlug) {
      listings = listings.filter((l) => l.category != null);
    }

    return { data: listings, hasMore };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch listings') };
  }
}

export interface StripOptions {
  limit?: number;
  offset?: number;
  categorySlug?: string;
}

/**
 * Fetch featured active listings in a metro, ordered by refreshed_at DESC.
 * Uses the partial index `idx_marketplace_listings_featured`.
 * Optionally scoped to a category via `opts.categorySlug`.
 */
export async function getFeaturedListings(
  supabase: SupabaseClient,
  metroId: string,
  opts: StripOptions = {}
): Promise<ListingsResult> {
  try {
    const limit = opts.limit ?? 10;
    const offset = opts.offset ?? 0;

    let query = supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .eq('is_featured', true)
      .order('refreshed_at', { ascending: false });

    if (opts.categorySlug) {
      query = query.eq('category.slug', opts.categorySlug);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // `hasMore` is derived from the raw page size BEFORE the client-side
    // category filter below, so pagination still advances when a page
    // filters down to zero matches.
    const rawRows = (data || []) as MarketplaceListing[];
    const hasMore = rawRows.length === limit;

    let rows = rawRows;
    if (opts.categorySlug) {
      rows = rows.filter((l) => l.category != null);
    }

    return { data: rows, hasMore };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch featured listings') };
  }
}

/**
 * Fetch trending active listings in a metro, ordered by `trending_score` DESC
 * (views + saves*3 + contacts*5), tiebroken by refreshed_at.
 * Uses the partial index `idx_marketplace_listings_trending`.
 */
export async function getTrendingListings(
  supabase: SupabaseClient,
  metroId: string,
  opts: StripOptions = {}
): Promise<ListingsResult> {
  try {
    const limit = opts.limit ?? 10;
    const offset = opts.offset ?? 0;

    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .order('trending_score', { ascending: false })
      .order('refreshed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const rows = (data || []) as MarketplaceListing[];
    return { data: rows, hasMore: rows.length === limit };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch trending listings') };
  }
}

/**
 * Get a single listing by ID, with owner and category info joined.
 */
export async function getListingById(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingResult> {
  try {
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('id', listingId)
      .neq('status', 'removed')
      .single();

    // PGRST116: no row. 22P02: the id isn't a UUID, as in a mistyped link,
    // which no retry would fix. Matches getEventById.
    const code = (error as { code?: string } | null)?.code;
    if (code === 'PGRST116' || code === '22P02') {
      return { error: new Error('Listing not found'), notFound: true };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Listing not found'), notFound: true };
    return { data: data as MarketplaceListing };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch listing') };
  }
}

/**
 * Get a seller's active listings for display on the public profile view.
 *
 * Only `status='active'` is returned, regardless of whether the viewer
 * is the owner — sold / hidden / expired listings never appear on another
 * user's public profile. RLS on marketplace_listings already allows any
 * authenticated user to read active rows, so this works for strangers.
 */
export async function getActiveListingsBySeller(
  supabase: SupabaseClient,
  sellerId: string,
  limit: number = 30
): Promise<ListingsResult> {
  try {
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('owner_id', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []) as MarketplaceListing[] };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error
          : new Error('Failed to fetch seller listings'),
    };
  }
}

/**
 * Get listings created by a specific user (for My Listings / profile view).
 * Includes all statuses except 'removed'. Ordered by created_at DESC.
 */
export async function getListingsByOwner(
  supabase: SupabaseClient,
  ownerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ListingsResult> {
  try {
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('owner_id', ownerId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data || []) as MarketplaceListing[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch owner listings') };
  }
}

// ─── Listings: Write ────────────────────────────────────────────────────────

/**
 * Create a new marketplace listing. Returns the created listing.
 */
export async function createListing(
  supabase: SupabaseClient,
  payload: CreateListingInput & { owner_id: string; metro_area_id: string }
): Promise<ListingResult> {
  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        owner_id: payload.owner_id,
        metro_area_id: payload.metro_area_id,
        category_id: payload.category_id,
        listing_type: payload.listing_type,
        title: payload.title,
        description: payload.description,
        photos: payload.photos ?? [],
        price: payload.price?.trim() || null,
        business_name: payload.business_name?.trim() || null,
        address: payload.address?.trim() || null,
        business_hours: payload.business_hours ?? null,
        item_condition: payload.item_condition ?? null,
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        website_url: payload.website_url?.trim() || null,
        status: 'active',
        is_global: false,
      })
      .select(LISTING_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned after insert');
    return { data: data as MarketplaceListing };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to create listing') };
  }
}

/**
 * Update an existing listing. Owner-only (enforced by RLS).
 */
export async function updateListing(
  supabase: SupabaseClient,
  listingId: string,
  payload: UpdateListingInput
): Promise<ListingResult> {
  try {
    const updatePayload: Record<string, unknown> = {};

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.category_id !== undefined) updatePayload.category_id = payload.category_id;
    if (payload.listing_type !== undefined) updatePayload.listing_type = payload.listing_type;
    if (payload.photos !== undefined) updatePayload.photos = payload.photos;
    if ('price' in payload) updatePayload.price = payload.price?.trim() || null;
    if ('business_name' in payload) updatePayload.business_name = payload.business_name?.trim() || null;
    if ('address' in payload) updatePayload.address = payload.address?.trim() || null;
    if ('business_hours' in payload) updatePayload.business_hours = payload.business_hours ?? null;
    if ('item_condition' in payload) updatePayload.item_condition = payload.item_condition ?? null;
    if ('phone' in payload) updatePayload.phone = payload.phone?.trim() || null;
    if ('email' in payload) updatePayload.email = payload.email?.trim() || null;
    if ('website_url' in payload) updatePayload.website_url = payload.website_url?.trim() || null;

    const { data, error } = await supabase
      .from('marketplace_listings')
      .update(updatePayload)
      .eq('id', listingId)
      .select(LISTING_SELECT)
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Listing not found') };
    }
    if (error) throw error;
    if (!data) return { error: new Error('Listing not found') };
    return { data: data as MarketplaceListing };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to update listing') };
  }
}

/**
 * Deactivate a listing — sets status to 'inactive'.
 */
export async function deactivateListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: 'inactive' })
      .eq('id', listingId)
      .select('id')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Listing not found or not allowed') };
    }
    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to deactivate listing') };
  }
}

/**
 * Reactivate a listing — sets status to 'active' and resets refreshed_at.
 */
export async function reactivateListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: 'active', refreshed_at: new Date().toISOString() })
      .eq('id', listingId)
      .select('id')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Listing not found or not allowed') };
    }
    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to reactivate listing') };
  }
}

/**
 * Soft-delete a listing — sets status to 'removed'. Disappears from all feeds.
 */
export async function deleteListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: 'removed' })
      .eq('id', listingId)
      .select('id')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Listing not found or not allowed') };
    }
    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to delete listing') };
  }
}

/**
 * Refresh a listing — resets refreshed_at to now().
 * Prevents the listing from being deprioritized by the 90-day soft expiry.
 */
export async function refreshListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ refreshed_at: new Date().toISOString() })
      .eq('id', listingId)
      .select('id')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Listing not found or not allowed') };
    }
    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to refresh listing') };
  }
}

// ─── Saved Listings ─────────────────────────────────────────────────────────

/**
 * Save/bookmark a listing.
 */
export async function saveListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('saved_listings')
      .insert({ user_id: user.id, listing_id: listingId });

    // Idempotent: if already saved, treat as success
    if ((error as { code?: string } | null)?.code === '23505') {
      return {};
    }

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to save listing') };
  }
}

/**
 * Unsave/unbookmark a listing.
 */
export async function unsaveListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to unsave listing') };
  }
}

/**
 * Get all listing IDs that a user has saved.
 * Used to hydrate save button states on load.
 */
export async function getUserSavedListingIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: string[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', userId);

    if (error) throw error;
    return { data: (data || []).map((row: { listing_id: string }) => row.listing_id) };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch saved listing IDs') };
  }
}

/**
 * Get full saved listings with details for a user (profile Saved tab).
 */
export async function getSavedListingsByUser(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<SavedListingsResult> {
  try {
    const { data, error } = await supabase
      .from('saved_listings')
      .select(`
        listing_id,
        listing:marketplace_listings_view!saved_listings_listing_id_fkey (
          ${LISTING_SELECT}
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Extract the nested listing objects
    const listings = (data || [])
      .map((row: { listing: MarketplaceListing | MarketplaceListing[] | null }) => {
        const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
        return listing;
      })
      .filter((l): l is MarketplaceListing => l != null && l.status === 'active');

    return { data: listings };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch saved listings') };
  }
}

// ─── Engagement Counters ────────────────────────────────────────────────────

/**
 * Increment views_count for a listing (called when detail screen is opened).
 * Non-critical — silently swallows errors to avoid blocking page load.
 */
export async function incrementListingViews(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    await supabase.rpc('increment_listing_views', {
      p_listing_id: listingId,
    });
    return {};
  } catch {
    return {};
  }
}

/**
 * Increment contacts_count for a listing (called when chat is initiated).
 */
export async function incrementListingContacts(
  supabase: SupabaseClient,
  listingId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.rpc('increment_listing_contacts', {
      p_listing_id: listingId,
    });

    if (error) {
      // Non-critical fallback
    }

    return {};
  } catch {
    return {};
  }
}
