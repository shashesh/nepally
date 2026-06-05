/**
 * Promotion validation schemas
 */
import { z } from 'zod';
import { MIN_PROMOTION_DAYS, MAX_PROMOTION_DAYS } from '../constants/promotions';

export const createPromotionSchema = z.object({
  listing_id: z.guid('Invalid listing ID'),
  promotion_type: z.enum(['featured_listing', 'sponsored_feed', 'sticky_business']),
  duration_days: z
    .number()
    .int('Duration must be a whole number')
    .min(MIN_PROMOTION_DAYS, `Minimum ${MIN_PROMOTION_DAYS} day`)
    .max(MAX_PROMOTION_DAYS, `Maximum ${MAX_PROMOTION_DAYS} days`),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
