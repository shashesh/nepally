/**
 * Bridges the browser's File objects to the shared storage API, which takes
 * raw bytes so it can serve mobile too. Create post built this mapping twice,
 * once per submit path; create listing and create event built their own.
 */

/**
 * Structurally what `uploadPostPhotos`, `uploadListingPhotos` and
 * `uploadEventPhoto` accept, so the result feeds any of them.
 */
export interface PhotoUploadInput {
  user_id: string;
  file_data: ArrayBuffer;
  mime_type: string;
  size_bytes: number;
  file_name: string;
}

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
