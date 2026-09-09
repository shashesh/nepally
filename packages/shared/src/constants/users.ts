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
