/**
 * Marketplace domain constants — categories, limits, and display config.
 * Single source of truth for both mobile and web platforms.
 */

export interface MarketplaceCategoryConfig {
  slug: string;
  name: string;
  emoji: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * 5 Nepali-tailored marketplace categories.
 * Must match the seed data after 016_consolidate_marketplace_categories.sql.
 */
export const MARKETPLACE_CATEGORIES: MarketplaceCategoryConfig[] = [
  { slug: 'food-restaurants',     name: 'Food & Restaurants',    emoji: '🍜', icon: 'restaurant', color: '#FF6B35', description: 'Nepali restaurants, cafes, catering, tiffin services, grocery stores, and specialty ingredients' },
  { slug: 'immigration-legal',    name: 'Immigration & Legal',   emoji: '⚖️', icon: 'scale',      color: '#9C27B0', description: 'Immigration attorneys, visa help, legal consultations, and document services' },
  { slug: 'professional-services',name: 'Professional Services', emoji: '💼', icon: 'briefcase',  color: '#2196F3', description: 'Consulting, IT, accounting, health, education, tutoring, home services, transportation, beauty, cultural, and all other professional services' },
  { slug: 'remittance-finance',   name: 'Remittance & Finance',  emoji: '💸', icon: 'cash',       color: '#FF9800', description: 'Money transfer, tax filing, financial planning, and remittance services' },
  { slug: 'other',                name: 'Other',                 emoji: '📦', icon: 'cube',       color: '#9E9E9E', description: 'Everything else not covered by other categories' },
];

/** Max photos per listing */
export const MAX_PHOTOS_PER_LISTING = 5;

/** Max title length */
export const MAX_LISTING_TITLE_LENGTH = 150;

/** Max description length */
export const MAX_LISTING_DESCRIPTION_LENGTH = 3000;

/** Days before a listing is considered stale (deprioritized in search) */
export const LISTING_SOFT_EXPIRY_DAYS = 90;

/** How close to soft expiry an active listing gets before its owner is warned */
export const LISTING_EXPIRY_WARNING_DAYS = 14;

/** Max listings a single user can create */
export const MAX_LISTINGS_PER_USER = 20;

/** Storage bucket for listing photos */
export const LISTING_PHOTOS_BUCKET = 'listing-photos';

/** Max listing photo size: 2 MB */
export const MAX_LISTING_PHOTO_BYTES = 2 * 1024 * 1024;

/** Allowed MIME types for listing photos */
export const ALLOWED_LISTING_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/** Listing type labels for display */
export const LISTING_TYPE_LABELS: Record<string, string> = {
  business: 'Business',
  individual: 'Individual',
};

/** Item condition labels for display */
export const ITEM_CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  used: 'Used',
};

/** Days of the week for business hours form */
export const BUSINESS_HOURS_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
