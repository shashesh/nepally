/**
 * Users table column visibility
 *
 * Migration 036 restricts anon/authenticated to a column-level SELECT grant on
 * public.users. Selecting anything outside this list (or `select('*')`) from a
 * client fails with "permission denied for table users". The caller's own full
 * row — email, phone, zip_code and the moderation/verification columns — is
 * only reachable through the `get_my_profile()` RPC.
 *
 * Keep in sync with the GRANT SELECT (...) list in
 * supabase/migrations/036_restrict_user_pii_and_chat_participation.sql.
 */
export const PUBLIC_USER_COLUMN_LIST = [
  'id',
  'full_name',
  'profile_photo',
  'bio',
  'hometown_district',
  'college',
  'years_in_us',
  'languages',
  'follower_count',
  'following_count',
  'metro_area_id',
  'trust_level',
  'is_premium',
  'is_moderator',
  'is_banned',
  'posts_count',
  'helpful_votes_received',
  'created_at',
  'updated_at',
  'last_active_at',
] as const;

export type PublicUserColumn = (typeof PUBLIC_USER_COLUMN_LIST)[number];

/** PostgREST select string for public profile reads. */
export const PUBLIC_USER_COLUMNS: string = PUBLIC_USER_COLUMN_LIST.join(', ');

/**
 * Square avatar crop/encode size, shared by web and mobile so both produce
 * the same asset. Avatars are shown at 80px; 500px leaves room for
 * high-density screens.
 */
export const PROFILE_PHOTO_SIZE_PX = 500;

/**
 * Largest source file the profile photo picker accepts, checked before the
 * centre-crop step (`cropToSquare` in apps/web/src/lib/resizeImage.ts) ever
 * decodes it. A 48-50MP photo from a modern phone camera decodes to roughly
 * 200MB of raw pixel data via `createImageBitmap`/canvas before any resize
 * happens, which can kill the tab (iOS Safari especially). File size is only
 * a proxy for pixel count — a lightly compressed JPEG can pack far fewer
 * megapixels per byte than a heavily compressed one — but it's a cheap,
 * synchronous check before that expensive decode, and 15MB comfortably
 * covers real camera output while catching the pathological cases.
 */
export const MAX_PROFILE_PHOTO_SOURCE_BYTES = 15 * 1024 * 1024;
