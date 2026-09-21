import { describe, expect, it, vi } from 'vitest';
import type { UploaderPhoto } from '../components/ui';
import { toPhotoUploadInputs, uploadPhotosInOrder } from './photoUploads';

function makeFile(name: string, type: string, contents = 'abc'): File {
  return new File([contents], name, { type });
}

function picked(name: string): UploaderPhoto {
  return { kind: 'picked', id: `id-${name}`, previewUrl: `blob:${name}`, file: makeFile(name, 'image/png') };
}

function stored(url: string): UploaderPhoto {
  return { kind: 'stored', url };
}

describe('toPhotoUploadInputs', () => {
  it('maps every file, in order, onto one upload input', async () => {
    const files = [
      makeFile('one.png', 'image/png'),
      makeFile('two.jpg', 'image/jpeg'),
      makeFile('three.webp', 'image/webp'),
    ];

    const inputs = await toPhotoUploadInputs(files, 'user-1');

    expect(inputs.map((input) => input.file_name)).toEqual(['one.png', 'two.jpg', 'three.webp']);
    expect(inputs.map((input) => input.mime_type)).toEqual(['image/png', 'image/jpeg', 'image/webp']);
    expect(inputs.every((input) => input.user_id === 'user-1')).toBe(true);
  });

  it('carries the bytes and size of each file', async () => {
    const inputs = await toPhotoUploadInputs([makeFile('one.png', 'image/png', 'hello')], 'user-1');

    expect(inputs[0].size_bytes).toBe(5);
    expect(inputs[0].file_data.byteLength).toBe(5);
  });

  it('falls back to JPEG when the browser reports no type', async () => {
    const inputs = await toPhotoUploadInputs([makeFile('mystery', '')], 'user-1');

    expect(inputs[0].mime_type).toBe('image/jpeg');
  });

  it('maps an empty list to an empty list', async () => {
    await expect(toPhotoUploadInputs([], 'user-1')).resolves.toEqual([]);
  });
});

describe('uploadPhotosInOrder', () => {
  it('uploads nothing when every photo is already stored', async () => {
    const upload = vi.fn();

    const result = await uploadPhotosInOrder([stored('u/a'), stored('u/b')], 'user-1', upload);

    expect(upload).not.toHaveBeenCalled();
    expect(result).toEqual({ urls: ['u/a', 'u/b'], paths: [] });
  });

  it('returns picked and stored photos interleaved in display order', async () => {
    const upload = vi.fn().mockResolvedValue({ urls: ['u/new1', 'u/new2'], paths: ['p/1', 'p/2'] });

    const result = await uploadPhotosInOrder(
      [picked('one.png'), stored('u/old'), picked('two.png')],
      'user-1',
      upload
    );

    expect(result).toEqual({ urls: ['u/new1', 'u/old', 'u/new2'], paths: ['p/1', 'p/2'] });
  });

  it('passes only the picked files to the uploader', async () => {
    const upload = vi.fn().mockResolvedValue({ urls: ['u/new'], paths: ['p/1'] });

    await uploadPhotosInOrder([stored('u/old'), picked('one.png')], 'user-1', upload);

    expect(upload).toHaveBeenCalledWith([expect.objectContaining({ file_name: 'one.png' })]);
  });

  it('reports the uploader failure rather than a partial order', async () => {
    const upload = vi.fn().mockResolvedValue({ error: new Error('Storage is full') });

    const result = await uploadPhotosInOrder([picked('one.png')], 'user-1', upload);

    expect(result).toEqual({ error: new Error('Storage is full') });
  });

  it('treats a missing url list as a failure', async () => {
    const upload = vi.fn().mockResolvedValue({});

    const result = await uploadPhotosInOrder([picked('one.png')], 'user-1', upload);

    expect('error' in result).toBe(true);
  });

  it('maps no photos to no urls', async () => {
    await expect(uploadPhotosInOrder([], 'user-1', vi.fn())).resolves.toEqual({ urls: [], paths: [] });
  });
});
