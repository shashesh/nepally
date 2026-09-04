/**
 * Shared moderation API — moderator-only queries and actions.
 * RLS (migration 035) enforces moderator visibility of pending posts and
 * status changes; bans go through the moderate_user() RPC.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostResult, PostsResult } from '../types/post';
import type { User } from '../types/user';
import type { UserResult } from './users';
import { POST_SELECT, flattenPostTags } from './posts';

const DEFAULT_QUEUE_PAGE_SIZE = 50;

export type ModerationPostStatus = 'active' | 'removed';

/**
 * Posts waiting for moderator review (Emergency submissions and auto-hidden
 * reported posts), oldest first so the queue is worked in order.
 */
export async function getPendingPosts(
  supabase: SupabaseClient,
  limit: number = DEFAULT_QUEUE_PAGE_SIZE,
  offset: number = 0
): Promise<PostsResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const rows = data || [];
    return { data: rows.map(flattenPostTags), hasMore: rows.length === limit };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch pending posts'),
    };
  }
}

/**
 * Fetch multiple posts by id in a single query (e.g. the posts referenced by
 * a page of reports), instead of one round trip per id.
 */
export async function getPostsByIds(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<PostsResult> {
  if (postIds.length === 0) {
    return { data: [] };
  }

  try {
    const { data, error } = await supabase.from('posts').select(POST_SELECT).in('id', postIds);

    if (error) throw error;

    return { data: (data || []).map(flattenPostTags) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch posts'),
    };
  }
}

/**
 * Approve ('active') or take down ('removed') a post. The status-transition
 * trigger rejects this for non-moderators.
 */
export async function setPostModerationStatus(
  supabase: SupabaseClient,
  postId: string,
  status: ModerationPostStatus
): Promise<PostResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select(POST_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Post not found');

    return { data: flattenPostTags(data) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to update post status'),
    };
  }
}

/**
 * Ban or unban a user via the moderate_user() RPC. Banning also removes the
 * user's active and pending posts server-side.
 */
export async function setUserBanStatus(
  supabase: SupabaseClient,
  userId: string,
  banned: boolean,
  reason?: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase.rpc('moderate_user', {
      p_user_id: userId,
      p_banned: banned,
      p_reason: reason ?? null,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('User not found');

    return { data: row as User };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to update ban status'),
    };
  }
}
