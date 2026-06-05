import { z } from 'zod';
import type { EventType } from '../types/events';

/** Literal tuple of all event types — preserves the EventType union for inference */
const EVENT_TYPE_TUPLE = ['cultural', 'religious', 'social', 'career', 'other'] as const satisfies readonly EventType[];

/** Base schema without cross-field refine — reused for updateEventSchema (partial) */
const eventBaseSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must be at most 150 characters')
    .refine((v) => v.trim().length >= 5, 'Title cannot be only whitespace'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(3000, 'Description must be at most 3000 characters')
    .refine((v) => v.trim().length >= 10, 'Description cannot be only whitespace'),

  event_type: z.enum(EVENT_TYPE_TUPLE, {
    message: 'Select a valid event type',
  }),

  start_date: z
    .string()
    .min(1, 'Start date is required')
    .refine((v) => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d > new Date();
    }, 'Start date must be in the future'),

  end_date: z.string().optional(),

  location_name: z
    .string()
    .min(5, 'Location name must be at least 5 characters')
    .max(100, 'Location name must be at most 100 characters'),

  location_address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .optional(),

  photo_url: z.string().url('Invalid photo URL').optional().or(z.literal('')),

  rsvp_visibility: z.enum(['public', 'private']).default('public'),

  is_global: z.boolean().default(false),
});

export const createEventSchema = eventBaseSchema.refine(
  (data) => {
    if (!data.end_date) return true;
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return !isNaN(end.getTime()) && end > start;
  },
  { message: 'End date must be after start date', path: ['end_date'] }
);

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Partial schema for event editing — all fields optional.
 * When both start_date and end_date are provided, end_date must be after start_date.
 */
export const updateEventSchema = eventBaseSchema
  .omit({ start_date: true })
  .extend({
    start_date: z
      .string()
      .refine((v) => {
        if (!v) return true; // empty string is treated as not-provided
        const d = new Date(v);
        return !isNaN(d.getTime());
      }, 'Start date must be a valid date')
      .optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date',
          path: ['end_date'],
        });
      }
    }
  });

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
