import { z } from 'zod';

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
    .array(z.string().uuid())
    .min(1, 'Select at least 1 tag')
    .max(3, 'Maximum 3 tags allowed'),

  photos: z
    .array(z.string().url())
    .max(5, 'Maximum 5 photos allowed')
    .optional()
    .default([]),

  is_global: z.boolean().optional().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
