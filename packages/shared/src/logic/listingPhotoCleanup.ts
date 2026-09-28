import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteListingPhotos, getListingPhotoPathFromUrl } from '../api/storage';
import { logClientEvent } from '../utils/clientLogger';

/**
 * Delete listing photos a submit no longer needs: the ones just uploaded when
 * the listing write failed, or the ones the member dropped once an edit saved.
 * Mirrors cleanUpPostPhotos.
 *
 * Not for deleting a listing: that is a soft delete moderators can undo, and
 * the photos stay as evidence for any report.
 *
 * The listing write has already decided what the member sees, so a failure
 * here doesn't change it. But a file left behind stays public at its URL, so
 * the failure is logged with the paths still in storage rather than dropped.
 */
export async function cleanUpListingPhotos(
  supabase: SupabaseClient,
  paths: string[],
  context: Record<string, unknown>
): Promise<void> {
  if (paths.length === 0) return;

  const { error, notRemoved } = await deleteListingPhotos(supabase, paths);
  if (error) {
    logClientEvent({
      event: 'listing_photos_cleanup_failed',
      error,
      context: { ...context, paths: notRemoved ?? paths },
    });
  }
}

/** Storage paths of the listing's original photos that an edit no longer keeps. */
export function droppedListingPhotoPaths(originalUrls: string[], keptUrls: string[]): string[] {
  const kept = new Set(keptUrls);
  return originalUrls
    .filter((url) => !kept.has(url))
    .map((url) => getListingPhotoPathFromUrl(url))
    .filter((path): path is string => Boolean(path));
}
