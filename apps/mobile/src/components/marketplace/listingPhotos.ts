/** A photo already saved on the listing, by its public URL. */
export interface StoredListingPhoto {
  kind: 'stored';
  /** The URL; unique within a listing. */
  key: string;
  url: string;
}

/** A photo picked on this device and not yet uploaded. */
export interface PickedListingPhoto {
  kind: 'picked';
  /** The processed file's URI; unique per pick. */
  key: string;
  uri: string;
  fileData: ArrayBuffer;
  mimeType: string;
  sizeBytes: number;
}

/**
 * The listing form's photos in display order, saved and new mixed. The first
 * is the cover: listing cards and the detail screen show `photos[0]`.
 */
export type ListingPhoto = StoredListingPhoto | PickedListingPhoto;

export function photoKeys(photos: readonly ListingPhoto[]): string[] {
  return photos.map((photo) => photo.key);
}

/** Moves a photo to the front. Returns the same list when there's nothing to move. */
export function makeCover(photos: ListingPhoto[], key: string): ListingPhoto[] {
  const index = photos.findIndex((photo) => photo.key === key);
  if (index <= 0) return photos;
  return [photos[index], ...photos.slice(0, index), ...photos.slice(index + 1)];
}

export function removePhoto(photos: readonly ListingPhoto[], key: string): ListingPhoto[] {
  return photos.filter((photo) => photo.key !== key);
}

/** The photos still to upload, in display order. */
export function pickedPhotos(photos: readonly ListingPhoto[]): PickedListingPhoto[] {
  return photos.filter((photo): photo is PickedListingPhoto => photo.kind === 'picked');
}

/**
 * Every photo's URL in display order, given the URLs storage returned for
 * `pickedPhotos(photos)`, in that same order.
 */
export function photoUrlsInOrder(
  photos: readonly ListingPhoto[],
  uploadedUrls: readonly string[]
): string[] {
  let next = 0;
  return photos
    .map((photo) => (photo.kind === 'stored' ? photo.url : uploadedUrls[next++]))
    .filter((url): url is string => Boolean(url));
}
