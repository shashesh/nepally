/**
 * Shared Post API functions
 * All Supabase query logic for posts — accepts SupabaseClient via dependency injection
 *
 * Updated for tag-based post system (no categories, no expiry).
 * See: docs/decisions/2026-02-17-post-tags-redesign-and-premium.md
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Post, PostsResult, PostResult, Tag } from '../types/post';

// ── Select fragment used across queries ─────────────────────────────
const POST_SELECT = `
  *,
  author:users!posts_author_id_fkey (
    id,
    full_name,
    trust_level,
    profile_photo
  ),
  post_tags(
    tag:tags(id, name, slug, icon, color)
  )
`;

/**
 * Flatten the nested post_tags → tag join into a flat `tags` array on the Post.
 */
function flattenPostTags(raw: any): Post {
  const { post_tags, ...rest } = raw;
  const tags: Tag[] = (post_tags || [])
    .map((pt: any) => pt.tag)
    .filter(Boolean);
  return { ...rest, tags } as Post;
}

/**
 * Get posts by metro area (local + global), with optional tag filter.
 *
 * The feed includes:
 *  - Active posts matching the user's metro area (local)
 *  - Active global posts (is_global = true) from any metro area
 * Both types are mixed chronologically.
 */
export async function getPostsByMetroArea(
  supabase: SupabaseClient,
  metroAreaId: string,
  tagSlugs?: string[],
  limit: number = 20,
  offset: number = 0
): Promise<PostsResult> {
  try {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'active')
      .or(`metro_area_id.eq.${metroAreaId},is_global.eq.true`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    let posts: Post[] = (data || []).map(flattenPostTags);

    // Client-side tag filtering (lightweight — could move to RPC if volume grows)
    if (tagSlugs && tagSlugs.length > 0) {
      posts = posts.filter((p) =>
        p.tags?.some((t) => tagSlugs.includes(t.slug))
      );
    }

    return { data: posts };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch posts'),
    };
  }
}

/**
 * Get post by ID (with author + tags)
 */
export async function getPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<PostResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Post not found');

    return { data: flattenPostTags(data) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch post'),
    };
  }
}

/**
 * Get posts created by a specific author.
 */
export async function getPostsByAuthorId(
  supabase: SupabaseClient,
  authorId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PostsResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('author_id', authorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: (data || []).map(flattenPostTags) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch user posts'),
    };
  }
}

/**
 * Get posts liked by a specific user.
 * Profile uses this as the Saved Posts list.
 */
export async function getSavedPostsByUserId(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PostsResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`${POST_SELECT}, post_likes!inner(user_id)`)
      .eq('status', 'active')
      .eq('post_likes.user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: (data || []).map(flattenPostTags) };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch saved posts'),
    };
  }
}

/**
 * Create a new post (Reddit-style: title + body + tag IDs)
 */
export async function createPost(
  supabase: SupabaseClient,
  params: {
    title: string;
    description: string;
    tag_ids: string[];
    photos?: string[];
    is_global?: boolean;
    metroAreaId: string;
    locationZipCode: string;
    locationCity: string;
    locationState: string;
    /** If any selected tag has requires_moderation = true, pass true here */
    requiresModeration?: boolean;
  }
): Promise<PostResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const currentUserId = authUser?.id ?? session?.user?.id;
    if (!currentUserId) {
      return { error: new Error('You must be logged in to create a post') };
    }

    // 1. Insert the post
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: currentUserId,
        metro_area_id: params.metroAreaId,
        title: params.title,
        description: params.description,
        photos: params.photos ?? [],
        is_global: params.is_global ?? false,
        status: params.requiresModeration ? 'pending' : 'active',
        location_zip_code: params.locationZipCode,
        location_city: params.locationCity,
        location_state: params.locationState,
      })
      .select()
      .single();

    if (postError) {
      console.error('Supabase createPost error:', postError.message, postError.details, postError.hint);
      return { error: new Error(postError.message) };
    }
    if (!postData) return { error: new Error('No data returned after insert') };

    // 2. Insert post_tags rows
    if (params.tag_ids.length > 0) {
      const tagRows = params.tag_ids.map((tagId) => ({
        post_id: postData.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagRows);

      if (tagError) {
        console.error('Failed to insert post_tags:', tagError.message);
        // Post was already created — log but don't fail the whole operation
      }
    }

    return { data: postData as Post };
  } catch (error) {
    console.error('createPost exception:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to create post'),
    };
  }
}

/**
 * Delete a post by ID. RLS enforces that only the author can delete their own post.
 */
export async function deletePost(
  supabase: SupabaseClient,
  postId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/**
 * Update an existing post by ID.
 * RLS enforces that only the author can update their own post.
 */
export async function updatePost(
  supabase: SupabaseClient,
  params: {
    post_id: string;
    title: string;
    description: string;
    tag_ids: string[];
    is_global?: boolean;
    photos?: string[];
  }
): Promise<PostResult> {
  try {
    const updatePayload: {
      title: string;
      description: string;
      is_global?: boolean;
      photos?: string[];
      updated_at: string;
    } = {
      title: params.title,
      description: params.description,
      updated_at: new Date().toISOString(),
    };

    if (typeof params.is_global === 'boolean') {
      updatePayload.is_global = params.is_global;
    }

    if (params.photos) {
      updatePayload.photos = params.photos;
    }

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', params.post_id)
      .select()
      .single();

    if (postError) {
      return { error: new Error(postError.message) };
    }

    // Replace post_tags rows with the new selection.
    const { error: deleteTagsError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', params.post_id);

    if (deleteTagsError) {
      return { error: new Error(deleteTagsError.message) };
    }

    if (params.tag_ids.length > 0) {
      const tagRows = params.tag_ids.map((tagId) => ({
        post_id: params.post_id,
        tag_id: tagId,
      }));

      const { error: insertTagsError } = await supabase
        .from('post_tags')
        .insert(tagRows);

      if (insertTagsError) {
        return { error: new Error(insertTagsError.message) };
      }
    }

    return { data: postData as Post };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to update post'),
    };
  }
}

