/**
 * Marketplace domain types — snake_case matching Supabase database columns
 * See: supabase/migrations/014_marketplace.sql
 */
import type { User } from './user';

export type ListingType = 'business' | 'individual';

export type ListingStatus = 'active' | 'inactive' | 'removed';

export type ItemCondition = 'new' | 'used';

/**
 * Sort options for marketplace listing queries.
 * - `newest` / `oldest`: by refreshed_at
 * - `featured`: is_featured DESC (computed from active listing_promotions), then refreshed_at DESC
 * - `price_asc` / `price_desc`: by price (TEXT column — lexicographic sort; see note in api/marketplace.ts)
 */
export type ListingSortBy = 'newest' | 'oldest' | 'featured' | 'price_asc' | 'price_desc';

export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  icon: string | null;
  color: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  owner_id: string;
  metro_area_id: string;
  category_id: string;
  listing_type: ListingType;
  status: ListingStatus;
  title: string;
  description: string;
  photos: string[];
  price: string | null;
  // Business-specific
  business_name: string | null;
  address: string | null;
  business_hours: BusinessHours | null;
  // Individual-specific
  item_condition: ItemCondition | null;
  // Contact info
  phone: string | null;
  email: string | null;
  website_url: string | null;
  // Visibility
  is_global: boolean;
  // Engagement counters
  views_count: number;
  saves_count: number;
  contacts_count: number;
  // Discovery surfaces (migration 018)
  // is_featured is now computed by marketplace_listings_view (migration 023).
  // Optional because write operations return rows from the base table only.
  is_featured?: boolean;
  trending_score: number;
  // Soft expiry
  refreshed_at: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  owner?: Pick<User, 'id' | 'full_name' | 'trust_level' | 'profile_photo'>;
  category?: MarketplaceCategory;
}

export interface SavedListing {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

/** Result types for API functions */
export interface ListingResult {
  data?: MarketplaceListing;
  error?: Error;
}

export interface ListingsResult {
  data?: MarketplaceListing[];
  error?: Error;
  hasMore?: boolean;
}

export interface CategoriesResult {
  data?: MarketplaceCategory[];
  error?: Error;
}

export interface SavedListingsResult {
  data?: MarketplaceListing[];
  error?: Error;
}
