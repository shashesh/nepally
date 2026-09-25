/**
 * Crop, upload, and point the profile at the new photo. Lifted out of
 * profile.page.tsx's processAndUpload so the crop/upload/write sequence can
 * be tested without rendering the page. The UI concerns it left behind —
 * retry state, refreshing the cached user — stay on the page.
 *
 * If the upload succeeds but the profile write fails, `<userId>.jpg` has
 * already been overwritten in storage — see setProfilePhoto's own doc
 * comment; there is nothing here to roll back either.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { logClientEvent, setProfilePhoto } from '@nepally/shared';
import { cropToSquare } from './resizeImage';
import { userMessage } from './userMessage';

const UPDATE_FAILED = "Couldn't update your photo. Please try again.";

export async function replaceProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ error: string | null }> {
  let cropped: File;
  try {
    cropped = await cropToSquare(file);
  } catch (error: unknown) {
    // A failed decode surfaces raw browser text (Chrome: "The source image
    // could not be decoded."), which isn't something a member can act on.
    // Log the detail and show copy that points at a fix instead — this also
    // covers the rare canvas failures (no 2D context, no blob) cropToSquare
    // can throw.
    logClientEvent({
      event: 'profile_photo_crop_failed',
      context: { platform: 'web', userId },
      error,
    });
    return { error: "We couldn't process that image. Try a different JPEG or PNG." };
  }

  const context = { platform: 'web', userId };
  try {
    const arrayBuffer = await cropped.arrayBuffer();
    const { error } = await setProfilePhoto(supabase, userId, arrayBuffer);
    return { error: error ? userMessage(error, UPDATE_FAILED, 'profile_photo_update_failed', context) : null };
  } catch (error: unknown) {
    return { error: userMessage(error, UPDATE_FAILED, 'profile_photo_update_failed', context) };
  }
}
