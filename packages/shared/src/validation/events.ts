import { z } from 'zod';
import { EVENT_TYPES } from '../constants/events';

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

  event_type: z.enum(EVENT_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Select a valid event type' }),
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

/** Partial schema for event editing — all fields optional */
export const updateEventSchema = eventBaseSchema.partial();

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
