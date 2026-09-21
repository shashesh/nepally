/**
 * Downscale a picked image before it is uploaded. Lifted out of
 * marketplace/create.page.tsx, where it ran untested, and reshaped to return a
 * File so it can be handed straight to ImageUploader's `transformFile`.
 */

/** Listing photos are never shown wider than this, so nothing larger is stored. */
export const MAX_IMAGE_WIDTH_PX = 1200;

/** Enough for a photo grid; small enough to keep uploads quick on a phone. */
export const JPEG_QUALITY = 0.8;

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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Failed to process image'))),
        'image/jpeg',
        JPEG_QUALITY
      );
    });

    return new File([blob], file.name, { type: 'image/jpeg' });
  } finally {
    // Release the decoded bitmap whether or not the encode worked.
    bitmap.close();
  }
}
