/**
 * Crop, upload, and point the profile at the new photo. Lifted out of
 * profile.page.tsx's processAndUpload so the upload/write sequence can be
 * tested without rendering the page. The UI concerns it left behind —
 * retry state, refreshing the cached user — stay on the page.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateUserProfile, uploadProfilePhoto } from '@nepally/shared';
import { cropToSquare } from './resizeImage';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function replaceProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ error: string | null }> {
  try {
    const cropped = await cropToSquare(file);
    const arrayBuffer = await cropped.arrayBuffer();

    const { url, error: uploadError } = await uploadProfilePhoto(supabase, userId, arrayBuffer);
    if (uploadError) throw uploadError;

    const { error: profileError } = await updateUserProfile(supabase, userId, { profile_photo: url });
    if (profileError) throw profileError;

    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error, 'Failed to upload photo') };
  }
}
