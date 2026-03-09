import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadEventPhoto } from './storage';

const ONE_MB = 1024 * 1024;
const TWO_MB = 2 * ONE_MB;

function buildMockStorageClient(overrides: {
  upload?: ReturnType<typeof vi.fn>;
  getPublicUrl?: ReturnType<typeof vi.fn>;
} = {}) {
  const upload = overrides.upload ?? vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl =
    overrides.getPublicUrl ??
    vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/event-photos/path/file.jpg' } });

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
