/**
 * The two ways create post can finish: a new post, or an edit.
 *
 * Both used to live inline on the page as near-identical 70-line branches.
 * They are pure functions here, so the rollback rules — delete what you just
 * uploaded if the write fails, delete what the member dropped only once it
 * succeeds — can be tested without rendering a form.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createPost,
  deletePostPhotos,
  getPostPhotoPathFromUrl,
  updatePost,
  uploadPostPhotos,
} from '@nepally/shared';
import type { UploaderPhoto } from '../components/ui';
import { uploadPhotosInOrder } from './photoUploads';

export interface SubmitResult {
  ok: boolean;
  /** Set when ok is false; the page renders it in its error Alert. */
  message?: string;
  /** Set by submitNewPost when the post went to a moderator, not the feed. */
  pendingModeration?: boolean;
}

export interface NewPostParams {
  userId: string;
  title: string;
  description: string;
  tagIds: string[];
  /** In display order. Only `picked` entries exist on a new post. */
  photos: UploaderPhoto[];
  isGlobal: boolean;
  metroAreaId: string;
  locationZipCode: string;
  locationCity: string;
  locationState: string;
  requiresModeration: boolean;
}

export interface EditedPostParams {
  postId: string;
  userId: string;
  title: string;
  description: string;
  tagIds: string[];
  /** In display order, mixing `stored` and `picked`. */
  photos: UploaderPhoto[];
  isGlobal: boolean;
  /** The post's photo URLs as loaded, so dropped ones can be deleted. */
  originalPhotoUrls: string[];
}

export async function submitNewPost(
  supabase: SupabaseClient,
  params: NewPostParams
): Promise<SubmitResult> {
  let uploadedPaths: string[] = [];

  try {
    const uploaded = await uploadPhotosInOrder(params.photos, params.userId, (inputs) =>
      uploadPostPhotos(supabase, inputs)
    );
    if ('error' in uploaded) {
      return { ok: false, message: uploaded.error.message };
    }
    uploadedPaths = uploaded.paths;

    const result = await createPost(supabase, {
      title: params.title,
      description: params.description,
      tag_ids: params.tagIds,
      photos: uploaded.urls,
      is_global: params.isGlobal,
      metroAreaId: params.metroAreaId,
      locationZipCode: params.locationZipCode,
      locationCity: params.locationCity,
      locationState: params.locationState,
      requiresModeration: params.requiresModeration,
    });

    if (result.error) {
      if (uploadedPaths.length > 0) {
        await deletePostPhotos(supabase, uploadedPaths);
      }
      return { ok: false, message: result.error.message };
    }

    return { ok: true, pendingModeration: params.requiresModeration };
  } catch {
    return { ok: false, message: 'Could not create post. Please check your connection and try again.' };
  }
}

export async function submitEditedPost(
  supabase: SupabaseClient,
  params: EditedPostParams
): Promise<SubmitResult> {
  let uploadedPaths: string[] = [];

  try {
    const uploaded = await uploadPhotosInOrder(params.photos, params.userId, (inputs) =>
      uploadPostPhotos(supabase, inputs)
    );
    if ('error' in uploaded) {
      return { ok: false, message: uploaded.error.message };
    }
    uploadedPaths = uploaded.paths;

    const result = await updatePost(supabase, {
      post_id: params.postId,
      title: params.title,
      description: params.description,
      tag_ids: params.tagIds,
      is_global: params.isGlobal,
      photos: uploaded.urls,
    });

    if (result.error) {
      if (uploadedPaths.length > 0) {
        await deletePostPhotos(supabase, uploadedPaths);
      }
      return { ok: false, message: result.error.message };
    }

    // Only now is it safe to let go of the photos the member removed.
    const keptUrls = new Set(
      params.photos.filter((photo) => photo.kind === 'stored').map((photo) => photo.url)
    );
    const droppedPaths = params.originalPhotoUrls
      .filter((url) => !keptUrls.has(url))
      .map((url) => getPostPhotoPathFromUrl(url))
      .filter((path): path is string => Boolean(path));

    if (droppedPaths.length > 0) {
      await deletePostPhotos(supabase, droppedPaths);
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not update post. Please check your connection and try again.' };
  }
}
