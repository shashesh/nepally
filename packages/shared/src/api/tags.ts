/**
 * Shared Tag API functions
 * All Supabase query logic for the `tags` table — accepts SupabaseClient via DI
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tag, TagsResult } from '../types/post';

/**
 * Get all available tags, sorted by sort_order
 */
export async function getTags(supabase: SupabaseClient): Promise<TagsResult> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return { data: (data || []) as Tag[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch tags'),
    };
  }
}

/**
 * Get a single tag by its slug
 */
export async function getTagBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data?: Tag; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Tag not found: ${slug}`);

    return { data: data as Tag };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch tag'),
    };
  }
}
