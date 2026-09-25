import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  uploadEventPhoto,
  uploadListingPhoto,
  uploadListingPhotos,
  deleteListingPhotos,
  deletePostPhotos,
  deleteProfilePhoto,
} from './storage';

const ONE_MB = 1024 * 1024;
const TWO_MB = 2 * ONE_MB;

function buildMockStorageClient(
  overrides: {
    upload?: ReturnType<typeof vi.fn>;
    getPublicUrl?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const upload = overrides.upload ?? vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl =
    overrides.getPublicUrl ??
    vi
      .fn()
      .mockReturnValue({
        data: { publicUrl: 'https://cdn.example.com/event-photos/path/file.jpg' },
      });

  const storageBucket = { upload, getPublicUrl };
  const storage = { from: vi.fn().mockReturnValue(storageBucket) };
  return {
    supabase: { storage } as unknown as SupabaseClient,
    upload,
    getPublicUrl,
  };
}

describe('uploadEventPhoto', () => {
  it('returns a public URL on success', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
      file_name: 'photo.jpg',
    });

    expect(result.error).toBeUndefined();
    expect(result.url).toContain('https://cdn.example.com');
    expect(result.path).toBeDefined();
  });

  it('rejects files larger than 2 MB', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(TWO_MB + 1),
      mime_type: 'image/jpeg',
      size_bytes: TWO_MB + 1,
      file_name: 'big.jpg',
    });

    expect(result.error?.message).toBe('Event photo must be 2MB or smaller');
    expect(result.url).toBeUndefined();
  });

  it('accepts files exactly at the 2 MB limit', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(TWO_MB),
      mime_type: 'image/png',
      size_bytes: TWO_MB,
      file_name: 'exact-limit.png',
    });

    expect(result.error).toBeUndefined();
    expect(result.url).toBeDefined();
  });

  it('rejects unsupported MIME types', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/gif',
      size_bytes: 100,
      file_name: 'animated.gif',
    });

    expect(result.error?.message).toBe('Unsupported image type');
    expect(result.url).toBeUndefined();
  });

  it('accepts image/webp MIME type', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/webp',
      size_bytes: 100,
      file_name: 'photo.webp',
    });

    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(/\.webp$/);
  });

  it('scopes the file path under the user_id folder', async () => {
    const { supabase, upload } = buildMockStorageClient();

    await uploadEventPhoto(supabase, {
      user_id: 'user-abc',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    const filePath: string = upload.mock.calls[0][0];
    expect(filePath.startsWith('user-abc/')).toBe(true);
  });

  it('returns an error when Supabase storage upload fails', async () => {
    const { supabase } = buildMockStorageClient({
      upload: vi.fn().mockResolvedValue({ error: new Error('Storage quota exceeded') }),
    });

    const result = await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    expect(result.error?.message).toBe('Storage quota exceeded');
    expect(result.url).toBeUndefined();
  });

  it('uses "event" as base name when file_name is omitted', async () => {
    const { supabase, upload } = buildMockStorageClient();

    await uploadEventPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    const filePath: string = upload.mock.calls[0][0];
    expect(filePath).toMatch(/user-1\/\d+-[a-z0-9]+-event\.jpg$/);
  });
});

// ─── Listing Photo Tests ───────────────────────────────────────────────────

describe('uploadListingPhoto', () => {
  it('returns a public URL on success', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
      file_name: 'item.jpg',
    });

    expect(result.error).toBeUndefined();
    expect(result.url).toContain('https://cdn.example.com');
    expect(result.path).toBeDefined();
  });

  it('rejects files larger than 2 MB', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(TWO_MB + 1),
      mime_type: 'image/jpeg',
      size_bytes: TWO_MB + 1,
      file_name: 'big.jpg',
    });

    expect(result.error?.message).toBe('Listing photo must be 2MB or smaller');
    expect(result.url).toBeUndefined();
  });

  it('accepts files exactly at the 2 MB limit', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(TWO_MB),
      mime_type: 'image/png',
      size_bytes: TWO_MB,
      file_name: 'exact.png',
    });

    expect(result.error).toBeUndefined();
    expect(result.url).toBeDefined();
  });

  it('rejects unsupported MIME types', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/gif',
      size_bytes: 100,
      file_name: 'animated.gif',
    });

    expect(result.error?.message).toBe('Unsupported image type');
    expect(result.url).toBeUndefined();
  });

  it('accepts image/webp MIME type', async () => {
    const { supabase } = buildMockStorageClient();

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/webp',
      size_bytes: 100,
      file_name: 'photo.webp',
    });

    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(/\.webp$/);
  });

  it('scopes the file path under the user_id folder', async () => {
    const { supabase, upload } = buildMockStorageClient();

    await uploadListingPhoto(supabase, {
      user_id: 'user-xyz',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    const filePath: string = upload.mock.calls[0][0];
    expect(filePath.startsWith('user-xyz/')).toBe(true);
  });

  it('uses "listing" as base name when file_name is omitted', async () => {
    const { supabase, upload } = buildMockStorageClient();

    await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    const filePath: string = upload.mock.calls[0][0];
    expect(filePath).toMatch(/user-1\/\d+-[a-z0-9]+-listing\.jpg$/);
  });

  it('returns an error when Supabase storage upload fails', async () => {
    const { supabase } = buildMockStorageClient({
      upload: vi.fn().mockResolvedValue({ error: new Error('Storage quota exceeded') }),
    });

    const result = await uploadListingPhoto(supabase, {
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    });

    expect(result.error?.message).toBe('Storage quota exceeded');
    expect(result.url).toBeUndefined();
  });
});

describe('uploadListingPhotos', () => {
  it('uploads multiple photos and returns all URLs', async () => {
    const { supabase } = buildMockStorageClient();

    const photos = [
      {
        user_id: 'user-1',
        file_data: new Uint8Array(100),
        mime_type: 'image/jpeg',
        size_bytes: 100,
      },
      {
        user_id: 'user-1',
        file_data: new Uint8Array(200),
        mime_type: 'image/png',
        size_bytes: 200,
      },
    ];

    const result = await uploadListingPhotos(supabase, photos);

    expect(result.error).toBeUndefined();
    expect(result.urls).toHaveLength(2);
    expect(result.paths).toHaveLength(2);
  });

  it('rejects when photo count exceeds MAX_PHOTOS_PER_LISTING', async () => {
    const { supabase } = buildMockStorageClient();

    const photos = Array.from({ length: 6 }, () => ({
      user_id: 'user-1',
      file_data: new Uint8Array(100),
      mime_type: 'image/jpeg',
      size_bytes: 100,
    }));

    const result = await uploadListingPhotos(supabase, photos);

    expect(result.error?.message).toContain('Maximum');
    expect(result.urls).toBeUndefined();
  });

  it('stops and returns error if any single upload fails', async () => {
    const uploadFn = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('Upload failed') });

    const { supabase } = buildMockStorageClient({ upload: uploadFn });

    const photos = [
      {
        user_id: 'user-1',
        file_data: new Uint8Array(100),
        mime_type: 'image/jpeg',
        size_bytes: 100,
      },
      {
        user_id: 'user-1',
        file_data: new Uint8Array(100),
        mime_type: 'image/jpeg',
        size_bytes: 100,
      },
    ];

    const result = await uploadListingPhotos(supabase, photos);

    expect(result.error).toBeDefined();
  });
});

function buildMockRemoveClient(result: { data: unknown; error: Error | null }) {
  const remove = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ remove });
  return { supabase: { storage: { from } } as unknown as SupabaseClient, remove, from };
}

/** Storage answers a remove with one row per object it actually deleted. */
function removedRows(paths: string[]) {
  return paths.map((name) => ({ name }));
}

describe('deletePostPhotos', () => {
  it('returns success when every path is removed', async () => {
    const paths = ['user-1/a.jpg', 'user-1/b.jpg'];
    const { supabase, remove, from } = buildMockRemoveClient({
      data: removedRows(paths),
      error: null,
    });

    const result = await deletePostPhotos(supabase, paths);

    expect(result.error).toBeUndefined();
    expect(from).toHaveBeenCalledWith('post-photos');
    expect(remove).toHaveBeenCalledWith(paths);
  });

  it('returns an error when storage removes fewer files than asked', async () => {
    // What a missing SELECT policy looks like: success, nothing deleted.
    const { supabase } = buildMockRemoveClient({ data: [], error: null });

    const result = await deletePostPhotos(supabase, ['user-1/a.jpg', 'user-1/b.jpg']);

    expect(result.error?.message).toBe('Removed 0 of 2 files from post-photos');
  });

  it('returns an error when storage returns no data at all', async () => {
    const { supabase } = buildMockRemoveClient({ data: null, error: null });

    const result = await deletePostPhotos(supabase, ['user-1/a.jpg']);

    expect(result.error).toBeDefined();
  });

  it('names only the paths storage did not remove', async () => {
    const { supabase } = buildMockRemoveClient({
      data: removedRows(['user-1/a.jpg']),
      error: null,
    });

    const result = await deletePostPhotos(supabase, ['user-1/a.jpg', 'user-1/b.jpg']);

    expect(result.notRemoved).toEqual(['user-1/b.jpg']);
  });

  it('names every path when storage itself fails, since none is known to be gone', async () => {
    const { supabase } = buildMockRemoveClient({
      data: null,
      error: new Error('storage unavailable'),
    });

    const result = await deletePostPhotos(supabase, ['user-1/a.jpg', 'user-1/b.jpg']);

    expect(result.notRemoved).toEqual(['user-1/a.jpg', 'user-1/b.jpg']);
  });

  it('names nothing when every path is removed', async () => {
    const paths = ['user-1/a.jpg'];
    const { supabase } = buildMockRemoveClient({ data: removedRows(paths), error: null });

    const result = await deletePostPhotos(supabase, paths);

    expect(result.notRemoved).toBeUndefined();
  });
});

describe('deleteProfilePhoto', () => {
  it('removes <userId>.jpg from the avatars bucket', async () => {
    const { supabase, remove, from } = buildMockRemoveClient({
      data: removedRows(['user-1.jpg']),
      error: null,
    });

    const result = await deleteProfilePhoto(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(from).toHaveBeenCalledWith('avatars');
    expect(remove).toHaveBeenCalledWith(['user-1.jpg']);
  });

  it('returns an error when nothing was removed', async () => {
    const { supabase } = buildMockRemoveClient({ data: [], error: null });

    const result = await deleteProfilePhoto(supabase, 'user-1');

    expect(result.error?.message).toBe('Removed 0 of 1 files from avatars');
  });
});

describe('deleteListingPhotos', () => {
  it('returns an error when storage removes fewer files than asked', async () => {
    const { supabase } = buildMockRemoveClient({ data: removedRows(['path/a.jpg']), error: null });

    const result = await deleteListingPhotos(supabase, ['path/a.jpg', 'path/b.jpg']);

    expect(result.error?.message).toBe('Removed 1 of 2 files from listing-photos');
  });

  it('returns success when paths are deleted', async () => {
    const removeFn = vi
      .fn()
      .mockResolvedValue({ data: removedRows(['path/a.jpg', 'path/b.jpg']), error: null });
    const storageBucket = { remove: removeFn };
    const storage = { from: vi.fn().mockReturnValue(storageBucket) };
    const supabase = { storage } as unknown as SupabaseClient;

    const result = await deleteListingPhotos(supabase, ['path/a.jpg', 'path/b.jpg']);

    expect(result.error).toBeUndefined();
    expect(removeFn).toHaveBeenCalledWith(['path/a.jpg', 'path/b.jpg']);
  });

  it('returns empty success for empty paths array', async () => {
    const removeFn = vi.fn();
    const storageBucket = { remove: removeFn };
    const storage = { from: vi.fn().mockReturnValue(storageBucket) };
    const supabase = { storage } as unknown as SupabaseClient;

    const result = await deleteListingPhotos(supabase, []);

    expect(result.error).toBeUndefined();
    expect(removeFn).not.toHaveBeenCalled();
  });

  it('returns an error when Supabase remove fails', async () => {
    const removeFn = vi.fn().mockResolvedValue({ error: new Error('Permission denied') });
    const storageBucket = { remove: removeFn };
    const storage = { from: vi.fn().mockReturnValue(storageBucket) };
    const supabase = { storage } as unknown as SupabaseClient;

    const result = await deleteListingPhotos(supabase, ['path/a.jpg']);

    expect(result.error?.message).toBe('Permission denied');
  });
});
