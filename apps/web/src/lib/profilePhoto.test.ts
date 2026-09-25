import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { replaceProfilePhoto } from './profilePhoto';

const { cropToSquare, setProfilePhoto, logClientEvent } = vi.hoisted(() => ({
  cropToSquare: vi.fn(),
  setProfilePhoto: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('./resizeImage', () => ({ cropToSquare }));
vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  setProfilePhoto,
  logClientEvent,
}));

const UPDATE_FAILED = "Couldn't update your photo. Please try again.";

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

  it("shows our copy for the shared API's error, never its text, and logs it", async () => {
    const error = new Error('new row violates row-level security policy');
    setProfilePhoto.mockResolvedValue({ error });

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: UPDATE_FAILED });
    expect(logClientEvent).toHaveBeenCalledWith({
      event: 'profile_photo_update_failed',
      context: { platform: 'web', userId: 'user-1' },
      error,
    });
  });

  it('turns a crop failure into copy a member can act on, and logs the raw detail', async () => {
    const decodeError = new Error('The source image could not be decoded.');
    cropToSquare.mockRejectedValue(decodeError);

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(setProfilePhoto).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "We couldn't process that image. Try a different JPEG or PNG." });
    expect(logClientEvent).toHaveBeenCalledWith({
      event: 'profile_photo_crop_failed',
      context: { platform: 'web', userId: 'user-1' },
      error: decodeError,
    });
  });

  it('shows the same friendly copy even when the crop step throws a non-Error value', async () => {
    cropToSquare.mockRejectedValue('boom');

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: "We couldn't process that image. Try a different JPEG or PNG." });
    expect(logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_photo_crop_failed', error: 'boom' })
    );
  });

  it('shows our copy and logs an unexpected failure after a successful crop', async () => {
    cropToSquare.mockResolvedValue({
      arrayBuffer: () => Promise.reject(new Error('socket hang up')),
    } as unknown as File);

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(setProfilePhoto).not.toHaveBeenCalled();
    expect(result).toEqual({ error: UPDATE_FAILED });
    expect(logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_photo_update_failed' })
    );
  });
});
