/**
 * Shared Interactions API functions (likes & comments)
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { PostComment } from '../types/post';

// ─── Likes API ──────────────────────────────────────────

/**
 * Like a post (creates a record in post_likes)
 */
export async function likePost(
  supabase: SupabaseClient,
  postId: string
): Promise<{ error?: Error }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id });

    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to like post'),
    };
  }
}

/**
 * Unlike a post (deletes the record from post_likes)
 */
export async function unlikePost(
  supabase: SupabaseClient,
  postId: string
): Promise<{ error?: Error }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to unlike post'),
    };
  }
}

/**
 * Get list of post IDs liked by a user (for UI state across feed)
 */
export async function getUserLikedPostIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: string[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (error) throw error;
    return { data: (data || []).map((row) => row.post_id) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch liked posts'),
    };
  }
}

// ─── Comments API ───────────────────────────────────────

/**
 * Get all comments for a post (non-deleted, chronological, with author info)
 */
export async function getPostComments(
  supabase: SupabaseClient,
  postId: string
): Promise<{ data?: PostComment[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        author:users!post_comments_author_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data || []) as PostComment[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch comments'),
    };
  }
}

/**
 * Create a new comment on a post
 */
export async function createComment(
  supabase: SupabaseClient,
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<{ data?: PostComment; error?: Error }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId ?? null,
      })
      .select(`
        *,
        author:users!post_comments_author_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .single();

    if (error) throw error;
    return { data: data as PostComment };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to create comment'),
    };
  }
}

/**
 * Soft-delete a comment (sets is_deleted = true)
 */
export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('post_comments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to delete comment'),
    };
  }
}
