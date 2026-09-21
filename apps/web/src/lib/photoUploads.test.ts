import { describe, expect, it } from 'vitest';
import { toPhotoUploadInputs } from './photoUploads';

function makeFile(name: string, type: string, contents = 'abc'): File {
  return new File([contents], name, { type });
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
