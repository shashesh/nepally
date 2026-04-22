/**
 * Fetches a raw candidate pool for follow suggestions. Does NOT rank — see
 * packages/shared/src/logic/followSuggestions.ts for ranking.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SuggestionCandidate } from '../logic/followSuggestions';

const CANDIDATE_LIMIT = 50;

interface Result {
  data?: SuggestionCandidate[];
  error?: Error;
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface UserRow {
  id: string;
  full_name: string;
  hometown_district: string | null;
  college: string | null;
  trust_level: number;
  follower_count: number;
  created_at: string;
  profile_photo: string | null;
}

interface FollowRow {
  followee_id: string;
}

interface BlockRow {
  blocker_id: string;
  blocked_id: string;
}

/**
 * Returns the candidate pool (same-metro, not-banned, not-self, not-followed,
 * not-blocked-either-direction). Ranking happens in logic/followSuggestions.
 */
export async function getFollowSuggestionCandidates(
  supabase: SupabaseClient,
  viewerId: string,
  metroAreaId: string
): Promise<Result> {
  try {
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select(
        'id, full_name, hometown_district, college, trust_level, follower_count, created_at, profile_photo'
      )
      .eq('metro_area_id', metroAreaId)
      .eq('is_banned', false)
      .neq('id', viewerId)
      .order('follower_count', { ascending: false })
      .limit(CANDIDATE_LIMIT);

    if (usersErr) throw usersErr;
    const users = (usersData ?? []) as UserRow[];
    if (users.length === 0) return { data: [] };

    const { data: followsData, error: followsErr } = await supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', viewerId);

    if (followsErr) throw followsErr;
    const followedIds = new Set(
      ((followsData ?? []) as FollowRow[]).map((r) => r.followee_id)
    );

    const { data: blocksData, error: blocksErr } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id');

    if (blocksErr) throw blocksErr;
    const blockedIds = new Set<string>();
    for (const b of (blocksData ?? []) as BlockRow[]) {
      if (b.blocker_id === viewerId) blockedIds.add(b.blocked_id);
      else if (b.blocked_id === viewerId) blockedIds.add(b.blocker_id);
    }

    const filtered: SuggestionCandidate[] = users
      .filter((u) => !followedIds.has(u.id) && !blockedIds.has(u.id))
      .map((u) => ({
        id: u.id,
        fullName: u.full_name,
        hometownDistrict: u.hometown_district,
        college: u.college,
        trustLevel: u.trust_level,
        followerCount: u.follower_count ?? 0,
        createdAt: u.created_at,
        profilePhoto: u.profile_photo,
      }));

    return { data: filtered };
  } catch (error) {
    return { error: toError(error, 'Failed to load follow suggestion candidates') };
  }
}
