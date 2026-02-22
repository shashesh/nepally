/**
 * Shared Storage API functions
 * Handles file uploads to Supabase Storage — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';

const AVATARS_BUCKET = 'avatars';

/**
 * Upload a profile photo to Supabase Storage.
 * Uses upsert to overwrite any existing avatar.
 * Accepts raw binary data (ArrayBuffer or Uint8Array) — callers handle file reading.
 * Returns the public URL with a cache-buster query param.
 */
export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  fileData: ArrayBuffer | Uint8Array
): Promise<{ url?: string; error?: Error }> {
  try {
    const fileName = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, fileData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    // Append cache-buster to force reload after update
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    return { url };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to upload photo'),
    };
  }
}

/**
 * Delete a user's profile photo from Supabase Storage.
 */
export async function deleteProfilePhoto(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: Error }> {
  try {
    const fileName = `${userId}.jpg`;

    const { error: deleteError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([fileName]);

    if (deleteError) throw deleteError;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to delete photo'),
    };
  }
}
