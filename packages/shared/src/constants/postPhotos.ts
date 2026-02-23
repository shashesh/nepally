import { MAX_PHOTOS_PER_POST } from './tags';

export const POST_PHOTOS_BUCKET = 'post-photos';

export const MAX_POST_PHOTO_BYTES = 5 * 1024 * 1024;

export const ALLOWED_POST_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_POST_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const POST_PHOTO_RULES = {
  max_per_post: MAX_PHOTOS_PER_POST,
  max_bytes: MAX_POST_PHOTO_BYTES,
  allowed_mime_types: ALLOWED_POST_PHOTO_MIME_TYPES,
} as const;
