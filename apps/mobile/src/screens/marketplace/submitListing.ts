/**
 * Saving the create/edit listing form: upload the new photos in display order,
 * write the listing, and tidy storage either way. An upload that fails part-way
 * deletes the photos it did upload. A failed write deletes the photos it just
 * uploaded when the server refused it (see cleanUpAfterFailedListingWrite). A
 * saved edit deletes the files of the photos the member dropped, and only then,
 * so a failed edit keeps them.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cleanUpAfterFailedListingWrite,
  cleanUpListingPhotos,
  createListing,
  droppedListingPhotoPaths,
  updateListing,
  uploadListingPhotos,
  userMessage,
  type ListingFormInput,
} from '@nepally/shared';
import {
  photoUrlsInOrder,
  pickedPhotos,
  type ListingPhoto,
} from '../../components/marketplace/listingPhotos';

const UPLOAD_FAILED = "Couldn't upload your photos. Please try again.";
const SAVE_FAILED = "Couldn't save your listing. Please try again.";

export interface SubmitListingParams {
  userId: string;
  metroAreaId: string;
  /** Set when editing an existing listing. */
  listingId?: string;
  input: ListingFormInput;
  /** In display order; the first is the cover. */
  photos: readonly ListingPhoto[];
  /** The listing's photo URLs as loaded, so a saved edit can delete the dropped ones. */
  originalPhotoUrls: readonly string[];
}

export type SubmitListingResult =
  { ok: true; listingId: string } | { ok: false; title: string; message: string };

export async function submitListing(
  supabase: SupabaseClient,
  params: SubmitListingParams
): Promise<SubmitListingResult> {
  const context = { platform: 'mobile', userId: params.userId, listingId: params.listingId };

  const picked = pickedPhotos(params.photos);
  let uploaded: { urls: string[]; paths: string[] } = { urls: [], paths: [] };
  if (picked.length > 0) {
    const upload = await uploadListingPhotos(
      supabase,
      picked.map((photo) => ({
        user_id: params.userId,
        file_data: photo.fileData,
        mime_type: photo.mimeType,
        size_bytes: photo.sizeBytes,
      }))
    );
    if (upload.error || !upload.urls) {
      await cleanUpListingPhotos(supabase, upload.paths ?? [], context);
      return {
        ok: false,
        title: 'Upload Failed',
        message: userMessage(upload.error, UPLOAD_FAILED, 'listing_photos_upload_failed', context),
      };
    }
    uploaded = { urls: upload.urls, paths: upload.paths ?? [] };
  }

  const payload = { ...params.input, photos: photoUrlsInOrder(params.photos, uploaded.urls) };
  const result = params.listingId
    ? await updateListing(supabase, params.listingId, payload)
    : await createListing(supabase, {
        ...payload,
        owner_id: params.userId,
        metro_area_id: params.metroAreaId,
      });

  if (result.error || !result.data) {
    await cleanUpAfterFailedListingWrite(supabase, result.error, uploaded.paths, context);
    return { ok: false, title: 'Error', message: result.error?.message ?? SAVE_FAILED };
  }

  if (params.listingId) {
    const dropped = droppedListingPhotoPaths(params.originalPhotoUrls, payload.photos);
    await cleanUpListingPhotos(supabase, dropped, context);
  }
  return { ok: true, listingId: result.data.id };
}
