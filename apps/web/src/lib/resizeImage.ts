/**
 * Client-side image prep before upload: downscale a picked photo
 * (resizeImage, lifted out of marketplace/create.page.tsx) or centre-crop
 * one to a square avatar (cropToSquare, lifted out of profile.page.tsx's
 * processAndUpload, which never closed the decoded bitmap). Both hand back
 * a File so they can be wired straight into ImageUploader's `transformFile`
 * or an upload call.
 */
import { PROFILE_PHOTO_SIZE_PX } from '@nepally/shared';

/** Listing photos are never shown wider than this, so nothing larger is stored. */
export const MAX_IMAGE_WIDTH_PX = 1200;

/** Enough for a photo grid or an avatar; small enough to keep uploads quick on a phone. */
export const JPEG_QUALITY = 0.8;

/** A picked photo's transparent areas turn black once flattened to JPEG unless matted first. */
export const PHOTO_MATTE_COLOR = '#ffffff';

/**
 * Shared by resizeImage and cropToSquare: encode a canvas as a JPEG File,
 * swapping whatever extension the source file had for `.jpg` since the
 * encode always is one.
 */
async function encodeCanvasAsJpegFile(canvas: HTMLCanvasElement, sourceFileName: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Failed to process image'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  const dotIndex = sourceFileName.lastIndexOf('.');
  const base = dotIndex === -1 ? sourceFileName : sourceFileName.slice(0, dotIndex);

  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export async function resizeImage(file: File): Promise<File> {
  // Browsers already apply the source's own EXIF orientation by default, so
  // this decodes correctly without passing an explicit imageOrientation —
  // Chrome/Edge 111 (inside Next 16's support floor) throws a TypeError on
  // the 'from-image' value some later browsers accept.
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
    context.imageSmoothingQuality = 'high';

    // Matte first: a transparent PNG would otherwise flatten to black once
    // encoded as JPEG, which has no alpha channel.
    context.fillStyle = PHOTO_MATTE_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return await encodeCanvasAsJpegFile(canvas, file.name);
  } finally {
    // Release the decoded bitmap whether or not the encode worked.
    bitmap.close();
  }
}

/**
 * Centre-crop a picked image to the largest square in the middle, then scale
 * it to at most `size` (never upscaling a smaller source) and encode as JPEG.
 */
export async function cropToSquare(file: File, size: number = PROFILE_PHOTO_SIZE_PX): Promise<File> {
  // See resizeImage: no explicit imageOrientation, since it's the default
  // and passing 'from-image' throws on Chrome/Edge 111.
  const bitmap = await createImageBitmap(file);

  try {
    const srcSize = Math.min(bitmap.width, bitmap.height);
    const outputSize = Math.min(size, srcSize);

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported in this browser');
    }
    context.imageSmoothingQuality = 'high';

    // Matte first: see resizeImage — a transparent source would otherwise
    // flatten to black.
    context.fillStyle = PHOTO_MATTE_COLOR;
    context.fillRect(0, 0, outputSize, outputSize);

    const srcX = (bitmap.width - srcSize) / 2;
    const srcY = (bitmap.height - srcSize) / 2;
    context.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);

    return await encodeCanvasAsJpegFile(canvas, file.name);
  } finally {
    // Release the decoded bitmap whether or not the encode worked.
    bitmap.close();
  }
}
