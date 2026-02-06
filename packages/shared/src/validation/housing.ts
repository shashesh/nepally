import { z } from 'zod';

/**
 * Housing post validation schema
 */

export const housingPostSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  rentAmount: z.number().min(0, 'Rent must be positive').max(10000, 'Rent seems unreasonably high'),
  moveInDate: z.date().min(new Date(), 'Move-in date must be in the future'),
  roomType: z.enum(['private', 'shared', 'entire-place']),
  bedrooms: z.number().int().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  furnished: z.boolean(),
  utilitiesIncluded: z.boolean(),
  petsAllowed: z.boolean(),
  parking: z.boolean(),
  lease: z.enum(['month-to-month', 'fixed-term']),
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code'),
  contactMethod: z.enum(['in-app', 'phone', 'email']),
  photos: z.array(z.string().url()).min(1, 'At least one photo required').max(10),
});

export type HousingPostInput = z.infer<typeof housingPostSchema>;
