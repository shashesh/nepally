import { z } from 'zod';
import {
  NEPAL_DISTRICTS,
  type NepalDistrict,
} from '../constants/nepalDistricts';
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../constants/languages';

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

export const COLLEGE_MAX_LENGTH = 100;
export const YEARS_IN_US_MIN = 0;
export const YEARS_IN_US_MAX = 99;

export const hometownDistrictSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z.enum(NEPAL_DISTRICTS as unknown as [NepalDistrict, ...NepalDistrict[]], {
      errorMap: () => ({ message: 'Select a valid Nepal district' }),
    })
  );

export const hometownDistrictUpdateSchema = hometownDistrictSchema
  .nullable()
  .optional();

export const collegeSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .max(
        COLLEGE_MAX_LENGTH,
        `College must be at most ${COLLEGE_MAX_LENGTH} characters`
      )
  )
  .transform((v) => (v.length === 0 ? null : v));

export const collegeUpdateSchema = collegeSchema.nullable().optional();

export const yearsInUsSchema = z
  .number()
  .int('Years in US must be a whole number')
  .min(YEARS_IN_US_MIN, `Years in US must be at least ${YEARS_IN_US_MIN}`)
  .max(YEARS_IN_US_MAX, `Years in US must be at most ${YEARS_IN_US_MAX}`);

export const yearsInUsUpdateSchema = yearsInUsSchema.nullable().optional();

export const languagesSchema = z
  .array(
    z.enum(SUPPORTED_LANGUAGES as unknown as [LanguageCode, ...LanguageCode[]])
  )
  .max(SUPPORTED_LANGUAGES.length, 'Too many languages selected');

export const languagesUpdateSchema = languagesSchema.optional();

/**
 * Partial update payload for the "About You" section of profile edit.
 * All fields optional; unspecified fields are not changed.
 */
export const extendedProfileUpdateSchema = z.object({
  hometown_district: hometownDistrictUpdateSchema,
  college: collegeUpdateSchema,
  years_in_us: yearsInUsUpdateSchema,
  languages: languagesUpdateSchema,
  bio: bioUpdateSchema,
});

export type ExtendedProfileUpdate = z.infer<typeof extendedProfileUpdateSchema>;
