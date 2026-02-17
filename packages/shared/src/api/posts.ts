/**
 * Shared Post API functions
 * All Supabase query logic for posts — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Post, PostsResult, PostResult } from '../types/post';

/**
 * Get posts by metro area with optional category filter
 */
export async function getPostsByMetroArea(
  supabase: SupabaseClient,
  metroAreaId: string,
  category?: string,
  limit: number = 20
): Promise<PostsResult> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .eq('metro_area_id', metroAreaId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: (data || []) as Post[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch posts'),
    };
  }
}

/**
 * Get post by ID
 */
export async function getPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<PostResult> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (
          id,
          full_name,
          trust_level,
          profile_photo
        )
      `)
      .eq('id', postId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Post not found');

    return { data: data as Post };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch post'),
    };
  }
}

/**
 * Create a new post
 */
export async function createPost(
  supabase: SupabaseClient,
  params: {
    metroAreaId: string;
    category: Post['category'];
    title: string;
    description: string;
    fields: Record<string, any>;
    expiryDate: string;
    locationZipCode: string;
    locationCity: string;
    locationState: string;
  }
): Promise<PostResult> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { error: new Error('You must be logged in to create a post') };
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: authUser.id,
        metro_area_id: params.metroAreaId,
        category: params.category,
        title: params.title,
        description: params.description,
        fields: params.fields,
        expiry_date: params.expiryDate,
        location_zip_code: params.locationZipCode,
        location_city: params.locationCity,
        location_state: params.locationState,
        photos: '{}',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase createPost error:', error.message, error.details, error.hint);
      return { error: new Error(error.message) };
    }
    if (!data) return { error: new Error('No data returned after insert') };

    return { data: data as Post };
  } catch (error) {
    console.error('createPost exception:', error);
    return {
      error: error instanceof Error ? error : new Error('Failed to create post'),
    };
  }
}
