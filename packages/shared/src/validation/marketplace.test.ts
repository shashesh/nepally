import { describe, expect, it } from 'vitest';
import { createListingSchema, updateListingSchema } from './marketplace';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

const VALID_BUSINESS_INPUT = {
  title: 'Nepali Restaurant in Dallas',
  description: 'Authentic Nepali food, momos, thali sets, and more.',
  category_id: VALID_UUID,
  listing_type: 'business' as const,
  photos: [],
  business_name: 'Himalayan Kitchen',
};

const VALID_INDIVIDUAL_INPUT = {
  title: 'Used Honda Civic 2020',
  description: 'Great condition, one owner, low mileage. Price negotiable.',
  category_id: VALID_UUID,
  listing_type: 'individual' as const,
  photos: [],
  item_condition: 'used' as const,
};

describe('createListingSchema', () => {
  it('accepts valid business listing', () => {
    const result = createListingSchema.safeParse(VALID_BUSINESS_INPUT);
    expect(result.success).toBe(true);
  });

  it('accepts valid individual listing', () => {
    const result = createListingSchema.safeParse(VALID_INDIVIDUAL_INPUT);
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, title: 'Hi' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('5 characters');
  });

  it('rejects title longer than 150 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, title: 'A'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only title', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, title: '     ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('whitespace');
  });

  it('rejects description shorter than 10 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 3000 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, description: 'A'.repeat(3001) });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only description', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, description: '          ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('whitespace');
  });

  it('rejects invalid category_id (non-UUID)', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, category_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid listing_type', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, listing_type: 'nonprofit' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 photos', () => {
    const photos = Array.from({ length: 6 }, (_, i) => `https://example.com/photo${i}.jpg`);
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, photos });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('5 photos');
  });

  it('rejects invalid photo URL', () => {
    const result = createListingSchema.safeParse({
      ...VALID_BUSINESS_INPUT,
      photos: ['not-a-url'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid photo URLs', () => {
    const result = createListingSchema.safeParse({
      ...VALID_BUSINESS_INPUT,
      photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    });
    expect(result.success).toBe(true);
  });

  // Business-specific cross-field validation
  it('requires business_name for business listings', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { business_name: _, ...withoutName } = VALID_BUSINESS_INPUT;
    const result = createListingSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes('business_name'))).toBe(true);
  });

  it('rejects empty business_name for business listings', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, business_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only business_name for business listings', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, business_name: '   ' });
    expect(result.success).toBe(false);
  });

  it('does not require business_name for individual listings', () => {
    const result = createListingSchema.safeParse(VALID_INDIVIDUAL_INPUT);
    expect(result.success).toBe(true);
  });

  // Optional fields
  it('accepts optional price', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, price: '$50/hr' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for price', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, price: '' });
    expect(result.success).toBe(true);
  });

  it('rejects price longer than 50 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, price: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for email', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, email: '' });
    expect(result.success).toBe(true);
  });

  it('accepts valid website_url', () => {
    const result = createListingSchema.safeParse({
      ...VALID_BUSINESS_INPUT,
      website_url: 'https://himalayankitchen.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid website_url', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, website_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts item_condition for individual listings', () => {
    const result = createListingSchema.safeParse(VALID_INDIVIDUAL_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.item_condition).toBe('used');
    }
  });

  it('accepts both item_condition values', () => {
    for (const condition of ['new', 'used'] as const) {
      const result = createListingSchema.safeParse({ ...VALID_INDIVIDUAL_INPUT, item_condition: condition });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid item_condition', () => {
    const result = createListingSchema.safeParse({ ...VALID_INDIVIDUAL_INPUT, item_condition: 'refurbished' });
    expect(result.success).toBe(false);
  });

  it('accepts valid business_hours', () => {
    const result = createListingSchema.safeParse({
      ...VALID_BUSINESS_INPUT,
      business_hours: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects business_hours with empty open time', () => {
    const result = createListingSchema.safeParse({
      ...VALID_BUSINESS_INPUT,
      business_hours: {
        monday: { open: '', close: '17:00' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('defaults photos to empty array when omitted', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { photos: _, ...withoutPhotos } = VALID_BUSINESS_INPUT;
    const result = createListingSchema.safeParse(withoutPhotos);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photos).toEqual([]);
    }
  });

  it('accepts both listing types', () => {
    for (const type of ['business', 'individual'] as const) {
      const input = type === 'business' ? VALID_BUSINESS_INPUT : VALID_INDIVIDUAL_INPUT;
      const result = createListingSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  // Boundary tests
  it('accepts title exactly 5 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, title: 'Hello' });
    expect(result.success).toBe(true);
  });

  it('accepts description exactly 10 characters', () => {
    const result = createListingSchema.safeParse({ ...VALID_BUSINESS_INPUT, description: '1234567890' });
    expect(result.success).toBe(true);
  });
});

describe('updateListingSchema', () => {
  it('accepts a partial update with only title', () => {
    const result = updateListingSchema.safeParse({ title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no changes)', () => {
    const result = updateListingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters in update', () => {
    const result = updateListingSchema.safeParse({ title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 10 characters in update', () => {
    const result = updateListingSchema.safeParse({ description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('accepts only description update', () => {
    const result = updateListingSchema.safeParse({ description: 'Updated description for the listing.' });
    expect(result.success).toBe(true);
  });

  it('accepts only price update', () => {
    const result = updateListingSchema.safeParse({ price: '$75/hr' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email in update', () => {
    const result = updateListingSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category_id in update', () => {
    const result = updateListingSchema.safeParse({ category_id: 'bad-uuid' });
    expect(result.success).toBe(false);
  });
});
