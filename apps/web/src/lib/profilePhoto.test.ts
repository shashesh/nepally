import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { replaceProfilePhoto } from './profilePhoto';

const { cropToSquare, setProfilePhoto, logClientEvent } = vi.hoisted(() => ({
  cropToSquare: vi.fn(),
  setProfilePhoto: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('./resizeImage', () => ({ cropToSquare }));
vi.mock('@nepally/shared', () => ({ setProfilePhoto, logClientEvent }));

const supabase = {} as SupabaseClient;

function croppedFile(contents = 'cropped-bytes'): File {
  return new File([contents], 'avatar.jpg', { type: 'image/jpeg' });
}

function pickedFile(name = 'photo.png'): File {
  return new File(['original'], name, { type: 'image/png' });
}

beforeEach(() => {
  vi.clearAllMocks();
  cropToSquare.mockResolvedValue(croppedFile());
  setProfilePhoto.mockResolvedValue({ url: 'https://cdn.example.com/user-1.jpg?t=1' });
});

describe('replaceProfilePhoto', () => {
  it('crops the picked file, uploads its bytes through setProfilePhoto and reports no error', async () => {
    const picked = pickedFile();

    const result = await replaceProfilePhoto(supabase, 'user-1', picked);

    expect(cropToSquare).toHaveBeenCalledWith(picked);
    expect(setProfilePhoto).toHaveBeenCalledWith(supabase, 'user-1', expect.any(ArrayBuffer));
    expect(logClientEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });

  it('uploads the cropped bytes, not the original file', async () => {
    cropToSquare.mockResolvedValue(croppedFile('actually-cropped'));

    await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    const bytes = setProfilePhoto.mock.calls[0][2] as ArrayBuffer;
    expect(new TextDecoder().decode(bytes)).toBe('actually-cropped');
  });

  it("passes the shared API's error message straight through", async () => {
    setProfilePhoto.mockResolvedValue({ error: new Error('Storage is full') });

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: 'Storage is full' });
    expect(logClientEvent).not.toHaveBeenCalled();
  });

  it('turns a crop failure into copy a member can act on, and logs the raw detail', async () => {
    const decodeError = new Error('The source image could not be decoded.');
    cropToSquare.mockRejectedValue(decodeError);

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(setProfilePhoto).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "We couldn't read that image. Try a JPEG or PNG." });
    expect(logClientEvent).toHaveBeenCalledWith({
      event: 'profile_photo_crop_failed',
      context: { platform: 'web', userId: 'user-1' },
      error: decodeError,
    });
  });

  it('shows the same friendly copy even when the crop step throws a non-Error value', async () => {
    cropToSquare.mockRejectedValue('boom');

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: "We couldn't read that image. Try a JPEG or PNG." });
    expect(logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_photo_crop_failed', error: 'boom' })
    );
  });

  it('falls back to a generic message for an unexpected non-Error failure after a successful crop', async () => {
    cropToSquare.mockResolvedValue({
      arrayBuffer: () => Promise.reject('boom'),
    } as unknown as File);

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(setProfilePhoto).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Failed to upload photo' });
    expect(logClientEvent).not.toHaveBeenCalled();
  });
});
