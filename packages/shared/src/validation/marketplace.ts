import { z } from 'zod';
import type { ListingType } from '../types/marketplace';
import {
  MAX_LISTING_TITLE_LENGTH,
  MAX_LISTING_DESCRIPTION_LENGTH,
  MAX_PHOTOS_PER_LISTING,
} from '../constants/marketplace';

const LISTING_TYPE_TUPLE = ['business', 'individual'] as const satisfies readonly ListingType[];
const ITEM_CONDITION_TUPLE = ['new', 'used'] as const;

const businessHourSlot = z.object({
  open: z.string().min(1, 'Open time is required'),
  close: z.string().min(1, 'Close time is required'),
});

const businessHoursSchema = z.object({
  monday: businessHourSlot.optional(),
  tuesday: businessHourSlot.optional(),
  wednesday: businessHourSlot.optional(),
  thursday: businessHourSlot.optional(),
  friday: businessHourSlot.optional(),
  saturday: businessHourSlot.optional(),
  sunday: businessHourSlot.optional(),
}).optional();

/** Base listing fields shared between create and update */
const listingBaseSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(MAX_LISTING_TITLE_LENGTH, `Title must be at most ${MAX_LISTING_TITLE_LENGTH} characters`)
    .refine((v) => v.trim().length >= 5, 'Title cannot be only whitespace'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(MAX_LISTING_DESCRIPTION_LENGTH, `Description must be at most ${MAX_LISTING_DESCRIPTION_LENGTH} characters`)
    .refine((v) => v.trim().length >= 10, 'Description cannot be only whitespace'),

  category_id: z.guid('Invalid category'),

  listing_type: z.enum(LISTING_TYPE_TUPLE, {
    message: 'Select a listing type',
  }),

  photos: z
    .array(z.string().url('Invalid photo URL'))
    .max(MAX_PHOTOS_PER_LISTING, `Maximum ${MAX_PHOTOS_PER_LISTING} photos allowed`)
    .default([]),

  price: z
    .string()
    .max(50, 'Price must be at most 50 characters')
    .optional()
    .or(z.literal('')),

  // Business-specific fields
  business_name: z
    .string()
    .max(100, 'Business name must be at most 100 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .optional()
    .or(z.literal('')),

  business_hours: businessHoursSchema,

  // Individual-specific fields
  item_condition: z.enum(ITEM_CONDITION_TUPLE).optional(),

  // Contact info
  phone: z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .or(z.literal('')),

  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  website_url: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
});

/**
 * Create listing schema with cross-field validation:
 * - Business listings should have business_name
 * - Individual listings can have item_condition
 */
export const createListingSchema = listingBaseSchema.superRefine((data, ctx) => {
  if (data.listing_type === 'business') {
    if (!data.business_name || data.business_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Business name is required for business listings',
        path: ['business_name'],
      });
    }
  }
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

/**
 * Partial schema for listing editing — all fields optional.
 */
export const updateListingSchema = listingBaseSchema.partial();

export type UpdateListingInput = z.infer<typeof updateListingSchema>;
