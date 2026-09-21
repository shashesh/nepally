/**
 * Downscale a picked image before it is uploaded. Lifted out of
 * marketplace/create.page.tsx, where it ran untested, and reshaped to return a
 * File so it can be handed straight to ImageUploader's `transformFile`.
 */

/** Listing photos are never shown wider than this, so nothing larger is stored. */
export const MAX_IMAGE_WIDTH_PX = 1200;

/** Avatars are shown at 80px; 500px leaves room for high-density screens. */
export const PROFILE_PHOTO_SIZE_PX = 500;

/** Enough for a photo grid; small enough to keep uploads quick on a phone. */
export const JPEG_QUALITY = 0.8;

/** Shared by resizeImage and cropToSquare: encode a canvas as a JPEG File. */
async function encodeCanvasAsJpegFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Failed to process image'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  return new File([blob], fileName, { type: 'image/jpeg' });
}

export async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported in this browser');
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return await encodeCanvasAsJpegFile(canvas, file.name);
  } finally {
    // Release the decoded bitmap whether or not the encode worked.
    bitmap.close();
  }
}

/**
 * Centre-crop a picked image to the largest square in the middle, then scale
 * it to `size` and encode as JPEG. Lifted out of profile.page.tsx's
 * processAndUpload, which never closed the decoded bitmap.
 */
export async function cropToSquare(file: File, size: number = PROFILE_PHOTO_SIZE_PX): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported in this browser');
    }

    const srcSize = Math.min(bitmap.width, bitmap.height);
    const srcX = (bitmap.width - srcSize) / 2;
    const srcY = (bitmap.height - srcSize) / 2;
    context.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

    return await encodeCanvasAsJpegFile(canvas, file.name);
  } finally {
    // Release the decoded bitmap whether or not the encode worked.
    bitmap.close();
  }
}
