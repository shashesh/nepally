/**
 * Shared Follows API — one-directional follow graph.
 * All functions accept SupabaseClient via dependency injection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { UserFollow } from '../types/follow';

interface FollowResult {
  data?: UserFollow;
  error?: Error;
  /** True when the follow row already existed (idempotent success). */
  alreadyFollowing?: boolean;
}

interface UnfollowResult {
  error?: Error;
}

interface BoolResult {
  data?: boolean;
  error?: Error;
}

interface FollowListResult {
  data?: UserFollow[];
  error?: Error;
}

interface Pagination {
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

/**
 * Follow another user. No-op if the follow already exists.
 * Rejects self-follows client-side (DB also has a CHECK constraint).
 */
export async function followUser(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<FollowResult> {
  if (followerId === followeeId) {
    return { error: new Error('You cannot follow yourself') };
  }

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .insert({ follower_id: followerId, followee_id: followeeId })
      .select()
      .single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return { alreadyFollowing: true };
      }
      throw error;
    }

    return { data: data as UserFollow };
  } catch (error) {
    return { error: toError(error, 'Failed to follow user') };
  }
}

/** Unfollow another user. No-op if the row does not exist. */
export async function unfollowUser(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<UnfollowResult> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId);

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: toError(error, 'Failed to unfollow user') };
  }
}

/** Returns true if `followerId` currently follows `followeeId`. */
export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<BoolResult> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .maybeSingle();

    if (error) throw error;
    return { data: Boolean(data) };
  } catch (error) {
    return { error: toError(error, 'Failed to check follow status') };
  }
}

/** Users who follow `userId`. Sorted newest-first. */
export async function getFollowers(
  supabase: SupabaseClient,
  userId: string,
  pagination: Pagination = {}
): Promise<FollowListResult> {
  const limit = clampLimit(pagination.limit);
  const offset = Math.max(pagination.offset ?? 0, 0);

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('followee_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data ?? []) as UserFollow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load followers') };
  }
}

/** Users that `userId` follows. Sorted newest-first. */
export async function getFollowing(
  supabase: SupabaseClient,
  userId: string,
  pagination: Pagination = {}
): Promise<FollowListResult> {
  const limit = clampLimit(pagination.limit);
  const offset = Math.max(pagination.offset ?? 0, 0);

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data ?? []) as UserFollow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load following') };
  }
}
