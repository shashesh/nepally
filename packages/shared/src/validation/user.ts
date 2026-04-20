import { z } from 'zod';

/**
 * User profile validation schemas.
 */

export const BIO_MAX_LENGTH = 200;

/**
 * Short self-description shown on the public profile.
 * - trimmed + control characters stripped first (keep tab + newline for line breaks)
 * - max 200 chars applied AFTER normalization so inputs whose stored value
 *   would fit the DB constraint aren't rejected for leading/trailing whitespace
 *   or stripped control characters (matches DB constraint in migration 025)
 * - empty string is normalized to null so the UI can distinguish
 *   "user hasn't set a bio" from "user set an empty bio"
 */
export const bioSchema = z
  .string()
  .transform((value) => value.trim())
  // eslint-disable-next-line no-control-regex
  .transform((value) => value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ''))
  .pipe(
    z.string().max(BIO_MAX_LENGTH, `Bio must be at most ${BIO_MAX_LENGTH} characters`)
  )
  .transform((value) => (value.length === 0 ? null : value));

/**
 * Accepts `undefined` (field omitted from update) or a bio string.
 * Use this for partial profile updates where bio is optional.
 */
export const bioUpdateSchema = bioSchema.nullable().optional();

export type BioInput = z.infer<typeof bioSchema>;
