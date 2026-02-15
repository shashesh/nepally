import { supabase } from '../../config/supabase';

export interface Post {
  id: string;
  category: 'housing' | 'jobs' | 'emergency' | 'travel';
  title: string;
  description: string;
  metro_area_id: string;
  author_id: string;
  location_zip_code: string;
  location_city: string;
  location_state: string;
  photos: string[];
  fields: Record<string, any>;
  status: 'active' | 'expired' | 'removed' | 'pending';
  expiry_date: string;
  created_at: string;
  updated_at: string;
  views_count: number;
  responses_count: number;
  author?: {
    id: string;
    full_name: string;
    trust_level: number;
  };
}

interface PostsResult {
  data?: Post[];
  error?: Error;
}

/**
 * Get posts by metro area with optional category filter
 */
export async function getPostsByMetroArea(
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
          trust_level
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
export async function getPostById(postId: string): Promise<{
  data?: Post;
  error?: Error;
}> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey (
          id,
          full_name,
          trust_level
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
export async function createPost(params: {
  metroAreaId: string;
  category: Post['category'];
  title: string;
  description: string;
  fields: Record<string, any>;
  expiryDate: string;
  locationZipCode: string;
  locationCity: string;
  locationState: string;
}): Promise<{
  data?: Post;
  error?: Error;
}> {
  try {
    // Use the authenticated user's ID from the current session
    // so author_id matches auth.uid() for the RLS policy
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
