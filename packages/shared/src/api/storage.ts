/**
 * Shared Storage API functions
 * Handles file uploads to Supabase Storage — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ALLOWED_POST_PHOTO_EXTENSIONS,
  POST_PHOTOS_BUCKET,
} from '../constants/postPhotos';
import {
  validatePostPhotoCount,
  validatePostPhotoFile,
} from '../validation/post';

const AVATARS_BUCKET = 'avatars';

export interface PostPhotoUploadInput {
  user_id: string;
  file_data: ArrayBuffer | Uint8Array;
  mime_type: string;
  size_bytes: number;
  file_name?: string;
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_').toLowerCase();
}

function buildPostPhotoPath(params: {
  userId: string;
  mimeType: string;
  originalName?: string;
}): string {
  const extension = getExtensionFromMimeType(params.mimeType);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const baseName = params.originalName
    ? sanitizeFileName(params.originalName).replace(/\.[a-zA-Z0-9]+$/, '')
    : 'photo';
  const finalBase = baseName.length > 40 ? baseName.slice(0, 40) : baseName;
  return `${params.userId}/${timestamp}-${randomSuffix}-${finalBase}.${extension}`;
}

/**
 * Upload one post photo to Supabase Storage.
 * Returns a public URL and storage path for optional cleanup.
 */
export async function uploadPostPhoto(
  supabase: SupabaseClient,
  input: PostPhotoUploadInput
): Promise<{ url?: string; path?: string; error?: Error }> {
  try {
    const validation = validatePostPhotoFile({
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
    });
    if (validation.error) return { error: validation.error };

    const extension = getExtensionFromMimeType(input.mime_type);
    if (!ALLOWED_POST_PHOTO_EXTENSIONS.includes(extension as (typeof ALLOWED_POST_PHOTO_EXTENSIONS)[number])) {
      return { error: new Error('Unsupported image extension') };
    }

    const filePath = buildPostPhotoPath({
      userId: input.user_id,
      mimeType: input.mime_type,
      originalName: input.file_name,
    });

    const { error: uploadError } = await supabase.storage
      .from(POST_PHOTOS_BUCKET)
      .upload(filePath, input.file_data, {
        contentType: input.mime_type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(POST_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to upload post photo'),
    };
  }
}

/**
 * Upload multiple post photos with validation.
 */
export async function uploadPostPhotos(
  supabase: SupabaseClient,
  photos: PostPhotoUploadInput[]
): Promise<{ urls?: string[]; paths?: string[]; error?: Error }> {
  const countValidation = validatePostPhotoCount(photos.length);
  if (countValidation.error) {
    return { error: countValidation.error };
  }

  const urls: string[] = [];
  const paths: string[] = [];

  for (const photo of photos) {
    const result = await uploadPostPhoto(supabase, photo);
    if (result.error || !result.url || !result.path) {
      return { error: result.error || new Error('Failed to upload post photo') };
    }
    urls.push(result.url);
    paths.push(result.path);
  }

  return { urls, paths };
}

/**
 * Best-effort cleanup for uploaded post photos.
 */
export async function deletePostPhotos(
  supabase: SupabaseClient,
  paths: string[]
): Promise<{ error?: Error }> {
  if (paths.length === 0) return {};

  try {
    const { error } = await supabase.storage
      .from(POST_PHOTOS_BUCKET)
      .remove(paths);

    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to delete post photos'),
    };
  }
}

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
