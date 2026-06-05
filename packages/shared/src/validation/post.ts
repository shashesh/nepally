import { z } from 'zod';
import {
  ALLOWED_POST_PHOTO_MIME_TYPES,
  MAX_POST_PHOTO_BYTES,
} from '../constants/postPhotos';
import { MAX_PHOTOS_PER_POST } from '../constants/tags';

/**
 * Generic post validation schema (Reddit-style: title + body + tags)
 * Replaces the old category-specific housing/jobs schemas.
 */

export const createPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must be at most 150 characters')
    .refine((v) => v.trim().length >= 5, 'Title cannot be only whitespace'),

  description: z
    .string()
    .min(10, 'Body must be at least 10 characters')
    .max(5000, 'Body must be at most 5000 characters')
    .refine((v) => v.trim().length >= 10, 'Body cannot be only whitespace'),

  tag_ids: z
    .array(z.guid())
    .min(1, 'Select at least 1 tag')
    .max(3, 'Maximum 3 tags allowed'),

  photos: z
    .array(z.string().url())
    .max(MAX_PHOTOS_PER_POST, `Maximum ${MAX_PHOTOS_PER_POST} photos allowed`)
    .optional()
    .default([]),

  is_global: z.boolean().optional().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const postPhotoFileSchema = z.object({
  mime_type: z
    .string()
    .refine(
      (value) => ALLOWED_POST_PHOTO_MIME_TYPES.includes(value as (typeof ALLOWED_POST_PHOTO_MIME_TYPES)[number]),
      `Unsupported image type. Allowed: ${ALLOWED_POST_PHOTO_MIME_TYPES.join(', ')}`
    ),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(MAX_POST_PHOTO_BYTES, `Image must be ${Math.round(MAX_POST_PHOTO_BYTES / (1024 * 1024))}MB or smaller`),
});

export type PostPhotoFileInput = z.infer<typeof postPhotoFileSchema>;

export function validatePostPhotoFile(input: PostPhotoFileInput): { error?: Error } {
  const result = postPhotoFileSchema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid image file';
    return { error: new Error(message) };
  }
  return {};
}

export function validatePostPhotoCount(count: number): { error?: Error } {
  if (count > MAX_PHOTOS_PER_POST) {
    return { error: new Error(`Maximum ${MAX_PHOTOS_PER_POST} photos allowed`) };
  }
  return {};
}
