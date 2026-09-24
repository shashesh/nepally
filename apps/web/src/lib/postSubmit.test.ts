import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UploaderPhoto } from '../components/ui';
import { submitEditedPost, submitNewPost } from './postSubmit';

const { createPost, updatePost, uploadPostPhotos, deletePostPhotos, getPostPhotoPathFromUrl, logClientEvent } =
  vi.hoisted(() => ({
    createPost: vi.fn(),
    updatePost: vi.fn(),
    uploadPostPhotos: vi.fn(),
    deletePostPhotos: vi.fn(),
    getPostPhotoPathFromUrl: vi.fn(),
    logClientEvent: vi.fn(),
  }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  createPost,
  updatePost,
  uploadPostPhotos,
  deletePostPhotos,
  getPostPhotoPathFromUrl,
  logClientEvent,
}));

const RLS_TEXT = 'new row violates row-level security policy';
const UPLOAD_FAILED = "Couldn't upload your photos. Please try again.";
const CREATE_FAILED = "Couldn't create your post. Please try again.";
const UPDATE_FAILED = "Couldn't update your post. Please try again.";

const supabase = {} as SupabaseClient;

function pickedPhoto(name: string): UploaderPhoto {
  return {
    kind: 'picked',
    id: `id-${name}`,
    previewUrl: `blob:${name}`,
    file: new File(['x'], name, { type: 'image/png' }),
  };
}

function storedPhoto(url: string): UploaderPhoto {
  return { kind: 'stored', url };
}

const NEW_POST = {
  userId: 'user-1',
  title: 'A title',
  description: 'A description long enough',
  tagIds: ['tag-1'],
  photos: [] as UploaderPhoto[],
  isGlobal: false,
  metroAreaId: 'metro-1',
  locationZipCode: '75001',
  locationCity: 'Dallas',
  locationState: 'TX',
  requiresModeration: false,
};

const EDITED_POST = {
  postId: 'post-1',
  userId: 'user-1',
  title: 'A title',
  description: 'A description long enough',
  tagIds: ['tag-1'],
  photos: [] as UploaderPhoto[],
  isGlobal: false,
  originalPhotoUrls: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
  createPost.mockResolvedValue({ data: { id: 'post-1' } });
  updatePost.mockResolvedValue({ data: { id: 'post-1' } });
  uploadPostPhotos.mockResolvedValue({ urls: [], paths: [] });
  deletePostPhotos.mockResolvedValue({});
  getPostPhotoPathFromUrl.mockImplementation((url: string) => `path/${url}`);
});

describe('submitNewPost', () => {
  it('creates a post with no photos without touching storage', async () => {
    const result = await submitNewPost(supabase, NEW_POST);

    expect(uploadPostPhotos).not.toHaveBeenCalled();
    expect(createPost).toHaveBeenCalledWith(supabase, expect.objectContaining({ photos: [] }));
    expect(result.ok).toBe(true);
  });

  it('uploads the picked photos first and passes their URLs', async () => {
    uploadPostPhotos.mockResolvedValue({ urls: ['u/one', 'u/two'], paths: ['p/one', 'p/two'] });

    await submitNewPost(supabase, {
      ...NEW_POST,
      photos: [pickedPhoto('one.png'), pickedPhoto('two.png')],
    });

    expect(uploadPostPhotos).toHaveBeenCalledBefore(createPost);
    expect(createPost).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ photos: ['u/one', 'u/two'] })
    );
  });

  it('reports an upload failure in our copy without creating anything', async () => {
    const error = new Error(RLS_TEXT);
    uploadPostPhotos.mockResolvedValue({ error });

    const result = await submitNewPost(supabase, { ...NEW_POST, photos: [pickedPhoto('one.png')] });

    expect(createPost).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, message: UPLOAD_FAILED });
    expect(logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'post_photos_upload_failed', error })
    );
  });

  it('deletes the photos it just uploaded when the post itself fails', async () => {
    uploadPostPhotos.mockResolvedValue({ urls: ['u/one'], paths: ['p/one'] });
    const error = new Error(RLS_TEXT);
    createPost.mockResolvedValue({ error });

    const result = await submitNewPost(supabase, { ...NEW_POST, photos: [pickedPhoto('one.png')] });

    expect(deletePostPhotos).toHaveBeenCalledWith(supabase, ['p/one']);
    expect(result).toEqual({ ok: false, message: CREATE_FAILED });
    expect(logClientEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'post_create_failed', error }));
  });

  it('says when a post went to a moderator instead of the feed', async () => {
    const result = await submitNewPost(supabase, { ...NEW_POST, requiresModeration: true });

    expect(result.pendingModeration).toBe(true);
  });

  it('turns a thrown error into a message the page can show', async () => {
    createPost.mockRejectedValue(new Error('socket hang up'));

    const result = await submitNewPost(supabase, NEW_POST);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/connection/i);
  });
});

describe('submitEditedPost', () => {
  it('writes a reordered mix of stored and new photos in display order', async () => {
    uploadPostPhotos.mockResolvedValue({ urls: ['u/new'], paths: ['p/new'] });

    await submitEditedPost(supabase, {
      ...EDITED_POST,
      photos: [pickedPhoto('new.png'), storedPhoto('u/old')],
      originalPhotoUrls: ['u/old'],
    });

    expect(updatePost).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ photos: ['u/new', 'u/old'] })
    );
  });

  it('deletes a dropped photo only after the update succeeds', async () => {
    await submitEditedPost(supabase, {
      ...EDITED_POST,
      photos: [storedPhoto('u/kept')],
      originalPhotoUrls: ['u/kept', 'u/dropped'],
    });

    expect(updatePost).toHaveBeenCalledBefore(deletePostPhotos);
    expect(deletePostPhotos).toHaveBeenCalledWith(supabase, ['path/u/dropped']);
  });

  it('keeps a dropped photo when the update fails', async () => {
    const error = new Error(RLS_TEXT);
    updatePost.mockResolvedValue({ error });

    const result = await submitEditedPost(supabase, {
      ...EDITED_POST,
      photos: [storedPhoto('u/kept')],
      originalPhotoUrls: ['u/kept', 'u/dropped'],
    });

    expect(deletePostPhotos).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, message: UPDATE_FAILED });
    expect(logClientEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'post_update_failed', error }));
  });

  it('reports an upload failure in our copy without updating anything', async () => {
    uploadPostPhotos.mockResolvedValue({ error: new Error(RLS_TEXT) });

    const result = await submitEditedPost(supabase, { ...EDITED_POST, photos: [pickedPhoto('new.png')] });

    expect(updatePost).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, message: UPLOAD_FAILED });
  });

  it('rolls back the photos it uploaded when the update fails', async () => {
    uploadPostPhotos.mockResolvedValue({ urls: ['u/new'], paths: ['p/new'] });
    updatePost.mockResolvedValue({ error: new Error('Rejected') });

    await submitEditedPost(supabase, { ...EDITED_POST, photos: [pickedPhoto('new.png')] });

    expect(deletePostPhotos).toHaveBeenCalledWith(supabase, ['p/new']);
  });

  it('ignores a dropped URL that is not a post photo', async () => {
    getPostPhotoPathFromUrl.mockReturnValue(null);

    await submitEditedPost(supabase, {
      ...EDITED_POST,
      photos: [],
      originalPhotoUrls: ['https://elsewhere.example.com/a.jpg'],
    });

    expect(deletePostPhotos).not.toHaveBeenCalled();
  });

  it('turns a thrown error into a message the page can show', async () => {
    updatePost.mockRejectedValue(new Error('socket hang up'));

    const result = await submitEditedPost(supabase, EDITED_POST);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/connection/i);
  });
});
