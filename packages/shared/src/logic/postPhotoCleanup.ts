import type { SupabaseClient } from '@supabase/supabase-js';
import { deletePostPhotos } from '../api/storage';
import { logClientEvent } from '../utils/clientLogger';

/**
 * Delete post photos a submit no longer needs: the ones just uploaded when the
 * post write failed, or the ones the member dropped once an edit saved.
 *
 * The post write has already decided what the member sees, so a failure here
 * doesn't change it. But a file left behind stays public at its URL, so the
 * failure is logged with the paths still in storage rather than dropped.
 */
export async function cleanUpPostPhotos(
  supabase: SupabaseClient,
  paths: string[],
  context: Record<string, unknown>
): Promise<void> {
  if (paths.length === 0) return;

  const { error, notRemoved } = await deletePostPhotos(supabase, paths);
  if (error) {
    logClientEvent({
      event: 'post_photos_cleanup_failed',
      error,
      context: { ...context, paths: notRemoved ?? paths },
    });
  }
}
