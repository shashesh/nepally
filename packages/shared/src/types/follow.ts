/**
 * Follow graph row — matches the user_follows table in the DB.
 * snake_case matches DB column names (see docs/decisions/2026-02-16-shared-types-snake-case.md).
 */

export interface UserFollow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
}
