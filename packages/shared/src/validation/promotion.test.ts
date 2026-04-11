import { describe, expect, it } from 'vitest';
import { createPromotionSchema } from './promotion';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

const VALID_INPUT = {
  listing_id: VALID_UUID,
  promotion_type: 'featured_listing' as const,
  duration_days: 7,
};

describe('createPromotionSchema', () => {
  it('accepts valid featured_listing input', () => {
    const result = createPromotionSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it('accepts valid sponsored_feed input', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      promotion_type: 'sponsored_feed',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid sticky_business input', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      promotion_type: 'sticky_business',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for listing_id', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      listing_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Invalid listing ID');
  });

  it('rejects invalid promotion_type', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      promotion_type: 'gold_tier',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration_days below minimum (1)', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      duration_days: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Minimum 1 day');
  });

  it('rejects duration_days above maximum (90)', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      duration_days: 91,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('Maximum 90 days');
  });

  it('rejects non-integer duration_days', () => {
    const result = createPromotionSchema.safeParse({
      ...VALID_INPUT,
      duration_days: 7.5,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('whole number');
  });

  it('accepts boundary values (1 day and 90 days)', () => {
    expect(createPromotionSchema.safeParse({ ...VALID_INPUT, duration_days: 1 }).success).toBe(true);
    expect(createPromotionSchema.safeParse({ ...VALID_INPUT, duration_days: 90 }).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(createPromotionSchema.safeParse({}).success).toBe(false);
    expect(createPromotionSchema.safeParse({ listing_id: VALID_UUID }).success).toBe(false);
    expect(createPromotionSchema.safeParse({ listing_id: VALID_UUID, promotion_type: 'featured_listing' }).success).toBe(false);
  });
});
