import { supabase } from '../../config/supabase';

interface Post {
  id: string;
  category: 'housing' | 'jobs' | 'emergency' | 'travel';
  title: string;
  description: string;
  metro_area_id: string;
  author_id: string;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  expires_at: string;
  metadata: Record<string, any>;
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
export async function createPost(
  authorId: string,
  metroAreaId: string,
  category: Post['category'],
  title: string,
  description: string,
  metadata: Record<string, any>,
  expiresAt: string
): Promise<{
  data?: Post;
  error?: Error;
}> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        metro_area_id: metroAreaId,
        category,
        title,
        description,
        metadata,
        expires_at: expiresAt,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create post');

    return { data: data as Post };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to create post'),
    };
  }
}
