import { describe, expect, it } from 'vitest';
import { MAX_POST_PHOTO_BYTES } from '../constants/postPhotos';
import { MAX_PHOTOS_PER_POST } from '../constants/tags';
import {
  createPostSchema,
  validatePostPhotoCount,
  validatePostPhotoFile,
} from './post';

const validTagIds = ['11111111-1111-1111-1111-111111111111'];

describe('post validation', () => {
  it('accepts valid post payloads', () => {
    const result = createPostSchema.safeParse({
      title: 'Looking for a roommate in Dallas',
      description: 'Private room available from next month in a shared apartment.',
      tag_ids: validTagIds,
      photos: ['https://example.com/photo.jpg'],
      is_global: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects whitespace-only title/description', () => {
    const result = createPostSchema.safeParse({
      title: '     ',
      description: '          ',
      tag_ids: validTagIds,
    });

    expect(result.success).toBe(false);
  });

  it('enforces maximum tag and photo counts', () => {
    const tooManyTags = createPostSchema.safeParse({
      title: 'Valid title here',
      description: 'This description is long enough to be valid by schema rules.',
      tag_ids: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
      ],
    });

    const tooManyPhotos = createPostSchema.safeParse({
      title: 'Valid title here',
      description: 'This description is long enough to be valid by schema rules.',
      tag_ids: validTagIds,
      photos: Array.from({ length: MAX_PHOTOS_PER_POST + 1 }, (_, idx) => `https://example.com/${idx}.jpg`),
    });

    expect(tooManyTags.success).toBe(false);
    expect(tooManyPhotos.success).toBe(false);
  });

  it('validates post photo files and count helpers', () => {
    expect(
      validatePostPhotoFile({
        mime_type: 'image/jpeg',
        size_bytes: MAX_POST_PHOTO_BYTES,
      }).error
    ).toBeUndefined();

    expect(
      validatePostPhotoFile({
        mime_type: 'image/gif',
        size_bytes: 100,
      }).error
    ).toBeInstanceOf(Error);

    expect(validatePostPhotoCount(MAX_PHOTOS_PER_POST).error).toBeUndefined();
    expect(validatePostPhotoCount(MAX_PHOTOS_PER_POST + 1).error).toBeInstanceOf(Error);
  });
});
