import { z } from 'zod';
import { NEPAL_DISTRICTS, type NepalDistrict } from '../constants/nepalDistricts';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../constants/languages';

/**
 * User profile validation schemas.
 */

export const BIO_MAX_LENGTH = 200;

export const FULL_NAME_MAX_LENGTH = 100;

/**
 * Zero-width/invisible formatting characters and bidi direction override or
 * isolate controls, none of which display but which can be used to spoof how
 * a name or bio renders — e.g. U+202E RIGHT-TO-LEFT OVERRIDE reverses the
 * visual order of the characters that follow it. Also covers the C1 control
 * range (U+0080–U+009F, non-printing and never legitimately typed).
 * Deliberately excludes U+200C/U+200D (ZWNJ/ZWJ): Devanagari conjuncts and
 * emoji ZWJ sequences depend on them to render correctly.
 */
const BIDI_AND_INVISIBLE_CHARS =
  /[\u0080-\u009F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * A member's display name. 001_schema.sql only constrains this column to
 * `NOT NULL` — no length limit, and no character restriction — so this is
 * the single source of truth both web and mobile should defer to.
 * - trimmed, then C0 control characters, bidi/invisible formatting
 *   characters and C1 controls are stripped (see BIDI_AND_INVISIBLE_CHARS)
 * - any run of whitespace (including a stripped-to-nothing tab or newline)
 *   collapses to a single space, then the result is trimmed again — unlike
 *   `bioSchema`, a name isn't expected to carry line breaks
 * - min 2 / max FULL_NAME_MAX_LENGTH applied AFTER normalization, so
 *   surrounding whitespace or stripped characters can't tip a name over
 *   either boundary
 * - deliberately has no letters-only pattern: OAuth names, Devanagari and
 *   other non-Latin scripts, and punctuation like "O'Brien-Rai" are all
 *   valid names (unlike `validateFullName` in utils/validators.ts, which
 *   this schema is intended to replace)
 */
export const fullNameSchema = z
  .string()
  .transform((value) => value.trim())
  // eslint-disable-next-line no-control-regex
  .transform((value) => value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ''))
  .transform((value) => value.replace(BIDI_AND_INVISIBLE_CHARS, ''))
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(
    z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(FULL_NAME_MAX_LENGTH, `Name must be at most ${FULL_NAME_MAX_LENGTH} characters`)
  );

export type FullNameInput = z.infer<typeof fullNameSchema>;

/**
 * Short self-description shown on the public profile.
 * - trimmed, then C0 control characters, bidi/invisible formatting
 *   characters and C1 controls are stripped (see BIDI_AND_INVISIBLE_CHARS;
 *   tab and newline are kept, and — unlike `fullNameSchema` — whitespace
 *   runs are not collapsed, so line breaks in a bio survive)
 * - max 200 chars applied AFTER normalization so inputs whose stored value
 *   would fit the DB constraint aren't rejected for leading/trailing whitespace
 *   or stripped characters (matches DB constraint in migration 025)
 * - empty string is normalized to null so the UI can distinguish
 *   "user hasn't set a bio" from "user set an empty bio"
 */
export const bioSchema = z
  .string()
  .transform((value) => value.trim())
  // eslint-disable-next-line no-control-regex
  .transform((value) => value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ''))
  .transform((value) => value.replace(BIDI_AND_INVISIBLE_CHARS, ''))
  .pipe(z.string().max(BIO_MAX_LENGTH, `Bio must be at most ${BIO_MAX_LENGTH} characters`))
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
      message: 'Select a valid Nepal district',
    })
  );

export const hometownDistrictUpdateSchema = hometownDistrictSchema.nullable().optional();

export const collegeSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z.string().max(COLLEGE_MAX_LENGTH, `College must be at most ${COLLEGE_MAX_LENGTH} characters`)
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
  .array(z.enum(SUPPORTED_LANGUAGES as unknown as [LanguageCode, ...LanguageCode[]]))
  .max(SUPPORTED_LANGUAGES.length, 'Too many languages selected')
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'Languages must be unique',
  });

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
