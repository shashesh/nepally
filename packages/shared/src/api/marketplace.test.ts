import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCategories,
  getListingsByMetro,
  getListingById,
  getListingsByOwner,
  createListing,
  updateListing,
  deactivateListing,
  reactivateListing,
  deleteListing,
  refreshListing,
  saveListing,
  unsaveListing,
  getUserSavedListingIds,
  getSavedListingsByUser,
  incrementListingViews,
  incrementListingContacts,
  getFeaturedListings,
  getTrendingListings,
} from './marketplace';

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  sort_order: 1,
};

const MOCK_LISTING = {
  id: 'listing-1',
  owner_id: 'user-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'business',
  status: 'active',
  title: 'Himalayan Kitchen',
  description: 'Authentic Nepali food.',
  photos: [],
  price: '$15-25',
  business_name: 'Himalayan Kitchen',
  address: '123 Main St',
  phone: '555-1234',
  email: 'info@himalayan.com',
  website_url: 'https://himalayan.com',
  item_condition: null,
  business_hours: null,
  is_global: false,
  views_count: 10,
  saves_count: 3,
  contacts_count: 1,
  is_featured: false,
  trending_score: 24,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── getCategories ──────────────────────────────────────────────────────────

describe('getCategories', () => {
  it('returns categories sorted by sort_order', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_CATEGORY], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getCategories(supabase);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe('Food & Restaurants');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getCategories(supabase);
    expect(result.error).toBeDefined();
  });

  it('returns empty array when no categories', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getCategories(supabase);
    expect(result.data).toEqual([]);
  });
});

// ─── getListingsByMetro ─────────────────────────────────────────────────────

describe('getListingsByMetro', () => {
  it('returns listings for a metro area', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
    };
    // Final call resolves with data
    chain.range.mockResolvedValue({ data: [MOCK_LISTING], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByMetro(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('listing-1');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByMetro(supabase, 'metro-1');
    expect(result.error).toBeDefined();
  });

  it('returns empty array when no listings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByMetro(supabase, 'metro-1');
    expect(result.data).toEqual([]);
  });

  it('applies textSearch filter when searchQuery provided', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    // range returns chain (it is called before textSearch in this case)
    chain.range.mockReturnValue(chain);
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { searchQuery: 'momo' });
    expect(chain.textSearch).toHaveBeenCalledWith('search_vector', 'momo', { type: 'websearch' });
  });

  it('filters out null-category listings when categorySlug used', async () => {
    const listingWithCategory = { ...MOCK_LISTING, category: MOCK_CATEGORY };
    const listingWithoutCategory = { ...MOCK_LISTING, id: 'listing-2', category: null };
    const response = { data: [listingWithCategory, listingWithoutCategory], error: null };
    // Build a thenable chain: all methods return chain, and await resolves to response
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.range = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(response));
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByMetro(supabase, 'metro-1', { categorySlug: 'food-restaurants' });
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('listing-1');
  });

  it('defaults to newest sort (refreshed_at DESC)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1');
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });

  it('applies oldest sort (refreshed_at ASC)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { sortBy: 'oldest' });
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: true });
  });

  it('applies featured sort (is_featured DESC, refreshed_at DESC)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { sortBy: 'featured' });
    expect(chain.order).toHaveBeenCalledWith('is_featured', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });

  it('applies price_asc sort (price ASC, nulls last)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { sortBy: 'price_asc' });
    expect(chain.order).toHaveBeenCalledWith('price', { ascending: true, nullsFirst: false });
  });

  it('applies price_desc sort (price DESC, nulls last)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { sortBy: 'price_desc' });
    expect(chain.order).toHaveBeenCalledWith('price', { ascending: false, nullsFirst: false });
  });
});

// ─── getFeaturedListings ────────────────────────────────────────────────────

describe('getFeaturedListings', () => {
  it('filters by is_featured = true and status = active', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getFeaturedListings(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'metro-1');
    expect(chain.eq).toHaveBeenCalledWith('is_featured', true);
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });

  it('respects custom limit', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getFeaturedListings(supabase, 'metro-1', { limit: 5 });
    expect(chain.range).toHaveBeenCalledWith(0, 4);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getFeaturedListings(supabase, 'metro-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getTrendingListings ────────────────────────────────────────────────────

describe('getTrendingListings', () => {
  it('orders by trending_score DESC then refreshed_at DESC', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getTrendingListings(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
    expect(chain.order).toHaveBeenCalledWith('trending_score', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });

  it('respects custom limit and offset', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getTrendingListings(supabase, 'metro-1', { limit: 5, offset: 10 });
    expect(chain.range).toHaveBeenCalledWith(10, 14);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getTrendingListings(supabase, 'metro-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getListingById ─────────────────────────────────────────────────────────

describe('getListingById', () => {
  it('returns a single listing', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_LISTING, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingById(supabase, 'listing-1');
    expect(result.data?.id).toBe('listing-1');
  });

  it('maps PGRST116 to "Listing not found"', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingById(supabase, 'missing');
    expect(result.error?.message).toBe('Listing not found');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingById(supabase, 'listing-1');
    expect(result.error).toBeDefined();
  });

  it('returns "Listing not found" when data is null without error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingById(supabase, 'listing-1');
    expect(result.error?.message).toBe('Listing not found');
  });
});

// ─── getListingsByOwner ─────────────────────────────────────────────────────

describe('getListingsByOwner', () => {
  it('returns listings for an owner', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByOwner(supabase, 'user-1');
    expect(result.data).toHaveLength(1);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByOwner(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });

  it('returns empty array when owner has no listings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getListingsByOwner(supabase, 'user-1');
    expect(result.data).toEqual([]);
  });
});

// ─── createListing ──────────────────────────────────────────────────────────

describe('createListing', () => {
  const CREATE_INPUT = {
    title: 'Himalayan Kitchen',
    description: 'Authentic Nepali food and catering.',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    photos: [] as string[],
    business_name: 'Himalayan Kitchen',
    owner_id: 'user-1',
    metro_area_id: 'metro-1',
  };

  it('inserts a new listing and returns it', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_LISTING, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createListing(supabase, CREATE_INPUT);
    expect(result.data?.id).toBe('listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createListing(supabase, CREATE_INPUT);
    expect(result.error).toBeDefined();
  });

  it('returns error when insert returns no data', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await createListing(supabase, CREATE_INPUT);
    expect(result.error?.message).toBe('No data returned after insert');
  });

  it('normalizes whitespace-only price to null', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_LISTING, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await createListing(supabase, { ...CREATE_INPUT, price: '   ' });
    const insertPayload = chain.insert.mock.calls[0][0];
    expect(insertPayload.price).toBeNull();
  });
});

// ─── updateListing ──────────────────────────────────────────────────────────

describe('updateListing', () => {
  it('updates a listing and returns updated data', async () => {
    const updated = { ...MOCK_LISTING, title: 'Updated Title' };
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateListing(supabase, 'listing-1', { title: 'Updated Title' });
    expect(result.data?.title).toBe('Updated Title');
  });

  it('maps PGRST116 to "Listing not found"', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateListing(supabase, 'missing', { title: 'New Title' });
    expect(result.error?.message).toBe('Listing not found');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateListing(supabase, 'listing-1', { title: 'New Title' });
    expect(result.error).toBeDefined();
  });

  it('returns "Listing not found" when data is null without error', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await updateListing(supabase, 'missing', { title: 'New Title' });
    expect(result.error?.message).toBe('Listing not found');
  });

  it('normalizes whitespace-only price to null in update payload', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_LISTING, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await updateListing(supabase, 'listing-1', { price: '   ' });
    const updatePayload = chain.update.mock.calls[0][0];
    expect(updatePayload.price).toBeNull();
  });
});

// ─── deactivateListing ──────────────────────────────────────────────────────

describe('deactivateListing', () => {
  it('deactivates a listing successfully', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await deactivateListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns "Listing not found or not allowed" on PGRST116', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await deactivateListing(supabase, 'missing');
    expect(result.error?.message).toBe('Listing not found or not allowed');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await deactivateListing(supabase, 'listing-1');
    expect(result.error).toBeDefined();
  });
});

// ─── reactivateListing ──────────────────────────────────────────────────────

describe('reactivateListing', () => {
  it('reactivates a listing successfully', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await reactivateListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error on PGRST116', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await reactivateListing(supabase, 'missing');
    expect(result.error?.message).toBe('Listing not found or not allowed');
  });
});

// ─── deleteListing ──────────────────────────────────────────────────────────

describe('deleteListing', () => {
  it('soft-deletes a listing successfully', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await deleteListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error on PGRST116', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await deleteListing(supabase, 'missing');
    expect(result.error?.message).toBe('Listing not found or not allowed');
  });
});

// ─── refreshListing ─────────────────────────────────────────────────────────

describe('refreshListing', () => {
  it('refreshes a listing successfully', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await refreshListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error on PGRST116', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' },
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await refreshListing(supabase, 'missing');
    expect(result.error?.message).toBe('Listing not found or not allowed');
  });
});

// ─── saveListing / unsaveListing ────────────────────────────────────────────

describe('saveListing', () => {
  it('saves a listing successfully', async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as SupabaseClient;

    const result = await saveListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('treats duplicate save as success (23505)', async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as SupabaseClient;

    const result = await saveListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as SupabaseClient;

    const result = await saveListing(supabase, 'listing-1');
    expect(result.error?.message).toBe('Not authenticated');
  });

  it('returns error on non-duplicate failure', async () => {
    const chain = {
      insert: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'Permission denied' } }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as SupabaseClient;

    const result = await saveListing(supabase, 'listing-1');
    expect(result.error).toBeDefined();
  });
});

describe('unsaveListing', () => {
  it('unsaves a listing successfully', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as SupabaseClient;

    const result = await unsaveListing(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });

  it('returns error when not authenticated', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as SupabaseClient;

    const result = await unsaveListing(supabase, 'listing-1');
    expect(result.error?.message).toBe('Not authenticated');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: new Error('Delete failed') });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as SupabaseClient;

    const result = await unsaveListing(supabase, 'listing-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getUserSavedListingIds ─────────────────────────────────────────────────

describe('getUserSavedListingIds', () => {
  it('returns saved listing IDs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ listing_id: 'listing-1' }, { listing_id: 'listing-2' }],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserSavedListingIds(supabase, 'user-1');
    expect(result.data).toEqual(['listing-1', 'listing-2']);
  });

  it('returns empty array when no saved listings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserSavedListingIds(supabase, 'user-1');
    expect(result.data).toEqual([]);
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getUserSavedListingIds(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getSavedListingsByUser ─────────────────────────────────────────────────

describe('getSavedListingsByUser', () => {
  it('returns saved listings with details', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ listing_id: 'listing-1', listing: MOCK_LISTING }],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSavedListingsByUser(supabase, 'user-1');
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('listing-1');
  });

  it('filters out removed listings', async () => {
    const removedListing = { ...MOCK_LISTING, id: 'listing-2', status: 'removed' };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          { listing_id: 'listing-1', listing: MOCK_LISTING },
          { listing_id: 'listing-2', listing: removedListing },
        ],
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSavedListingsByUser(supabase, 'user-1');
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('listing-1');
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSavedListingsByUser(supabase, 'user-1');
    expect(result.error).toBeDefined();
  });
});

// ─── Engagement Counters ────────────────────────────────────────────────────

describe('incrementListingViews', () => {
  it('calls rpc and returns no error on success', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as SupabaseClient;

    const result = await incrementListingViews(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith('increment_listing_views', {
      p_listing_id: 'listing-1',
    });
  });

  it('silently swallows errors', async () => {
    const supabase = {
      rpc: vi.fn().mockRejectedValue(new Error('RPC failed')),
    } as unknown as SupabaseClient;

    const result = await incrementListingViews(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });
});

describe('incrementListingContacts', () => {
  it('calls rpc and returns no error on success', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as SupabaseClient;

    const result = await incrementListingContacts(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith('increment_listing_contacts', {
      p_listing_id: 'listing-1',
    });
  });

  it('silently swallows errors', async () => {
    const supabase = {
      rpc: vi.fn().mockRejectedValue(new Error('RPC failed')),
    } as unknown as SupabaseClient;

    const result = await incrementListingContacts(supabase, 'listing-1');
    expect(result.error).toBeUndefined();
  });
});
