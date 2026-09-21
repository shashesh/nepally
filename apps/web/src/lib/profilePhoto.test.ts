import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { replaceProfilePhoto } from './profilePhoto';

const { cropToSquare, uploadProfilePhoto, updateUserProfile } = vi.hoisted(() => ({
  cropToSquare: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('./resizeImage', () => ({ cropToSquare }));
vi.mock('@nepally/shared', () => ({ uploadProfilePhoto, updateUserProfile }));

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
  uploadProfilePhoto.mockResolvedValue({ url: 'https://cdn.example.com/user-1.jpg?t=1' });
  updateUserProfile.mockResolvedValue({ data: { id: 'user-1' } });
});

describe('replaceProfilePhoto', () => {
  it('crops the picked file, uploads its bytes, writes the URL and reports no error', async () => {
    const picked = pickedFile();

    const result = await replaceProfilePhoto(supabase, 'user-1', picked);

    expect(cropToSquare).toHaveBeenCalledWith(picked);
    expect(uploadProfilePhoto).toHaveBeenCalledWith(supabase, 'user-1', expect.any(ArrayBuffer));
    expect(updateUserProfile).toHaveBeenCalledWith(supabase, 'user-1', {
      profile_photo: 'https://cdn.example.com/user-1.jpg?t=1',
    });
    expect(result).toEqual({ error: null });
  });

  it('uploads the cropped bytes, not the original file', async () => {
    cropToSquare.mockResolvedValue(croppedFile('actually-cropped'));

    await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    const bytes = uploadProfilePhoto.mock.calls[0][2] as ArrayBuffer;
    expect(new TextDecoder().decode(bytes)).toBe('actually-cropped');
  });

  it('reports an upload failure and never writes the profile', async () => {
    uploadProfilePhoto.mockResolvedValue({ error: new Error('Storage is full') });

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Storage is full' });
  });

  it('reports a profile write failure', async () => {
    updateUserProfile.mockResolvedValue({ error: new Error('Profile is locked') });

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: 'Profile is locked' });
  });

  it('reports a crop failure and never uploads', async () => {
    cropToSquare.mockRejectedValue(new Error('Unsupported image format'));

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(uploadProfilePhoto).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Unsupported image format' });
  });

  it('falls back to a generic message when the thrown value has no message', async () => {
    cropToSquare.mockRejectedValue('boom');

    const result = await replaceProfilePhoto(supabase, 'user-1', pickedFile());

    expect(result).toEqual({ error: 'Failed to upload photo' });
  });
});
