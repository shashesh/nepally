/**
 * Bridges the browser's File objects to the shared storage API, which takes
 * raw bytes so it can serve mobile too. Create post built this mapping twice,
 * once per submit path; create listing and create event built their own.
 */
import type { PhotoUploadInput } from '@nepally/shared';
import type { UploaderPhoto } from '../components/ui';

// The byte-level contract lives in packages/shared, where the upload
// functions that consume it live. Only the File-to-bytes step is web-only.
export type { PhotoUploadInput };

export async function toPhotoUploadInputs(files: File[], userId: string): Promise<PhotoUploadInput[]> {
  return Promise.all(
    files.map(async (file) => ({
      user_id: userId,
      file_data: await file.arrayBuffer(),
      // Some browsers hand back an empty type for an unfamiliar extension.
      mime_type: file.type || 'image/jpeg',
      size_bytes: file.size,
      file_name: file.name,
    }))
  );
}

/** The shape every `upload*Photos` function in the shared storage API returns. */
export type PhotoUploader = (
  inputs: PhotoUploadInput[]
) => Promise<{ urls?: string[]; paths?: string[]; error?: Error }>;

export interface OrderedUploadResult {
  /** Every photo's URL, in the order the member arranged them. */
  urls: string[];
  /** Storage paths for the newly uploaded photos, for rolling back a failed write. */
  paths: string[];
}

/**
 * Upload whatever the member picked, then read every photo's URL back in
 * display order — stored ones as they were, picked ones as storage named them.
 *
 * Reordering is why this cannot just concatenate: a member can drop a new
 * photo in front of one that is already saved.
 */
export async function uploadPhotosInOrder(
  photos: UploaderPhoto[],
  userId: string,
  upload: PhotoUploader
): Promise<OrderedUploadResult | { error: Error }> {
  const picked = photos.filter(
    (photo): photo is Extract<UploaderPhoto, { kind: 'picked' }> => photo.kind === 'picked'
  );

  if (picked.length === 0) {
    return {
      urls: photos.map((photo) => (photo.kind === 'stored' ? photo.url : '')).filter(Boolean),
      paths: [],
    };
  }

  const inputs = await toPhotoUploadInputs(
    picked.map((photo) => photo.file),
    userId
  );
  const result = await upload(inputs);
  if (result.error || !result.urls) {
    return { error: result.error ?? new Error('Failed to upload photos') };
  }

  const urlByPickedId = new Map<string, string>();
  picked.forEach((photo, index) => {
    const url = result.urls?.[index];
    if (url) urlByPickedId.set(photo.id, url);
  });

  const urls = photos
    .map((photo) => (photo.kind === 'stored' ? photo.url : urlByPickedId.get(photo.id) ?? null))
    .filter((url): url is string => Boolean(url));

  return { urls, paths: result.paths ?? [] };
}
