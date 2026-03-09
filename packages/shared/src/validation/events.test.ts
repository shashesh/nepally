import { describe, expect, it } from 'vitest';
import { createEventSchema, updateEventSchema } from './events';

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const FAR_FUTURE_DATE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

const VALID_INPUT = {
  title: 'Dashain Celebration 2026',
  description: 'Annual Dashain celebration with cultural programs and food.',
  event_type: 'cultural',
  start_date: FUTURE_DATE,
  location_name: 'Dallas Convention Center',
  rsvp_visibility: 'public' as const,
  is_global: false,
};

describe('createEventSchema', () => {
  it('accepts a valid event input', () => {
    const result = createEventSchema.safeParse(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, title: 'Hi' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('5 characters');
  });

  it('rejects title longer than 150 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, title: 'A'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 10 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects start_date in the past', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, start_date: PAST_DATE });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('future');
  });

  it('rejects invalid event_type', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, event_type: 'sports' });
    expect(result.success).toBe(false);
  });

  it('rejects location_name shorter than 5 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, location_name: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects end_date before start_date', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      end_date: PAST_DATE,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('end_date');
  });

  it('accepts valid end_date after start_date', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      end_date: FAR_FUTURE_DATE,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fields being absent', () => {
    const { location_address, photo_url, end_date, ...minimal } = {
      ...VALID_INPUT,
      location_address: undefined,
      photo_url: undefined,
      end_date: undefined,
    };
    const result = createEventSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects location_address longer than 200 characters', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      location_address: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('defaults rsvp_visibility to public when not provided', () => {
    const { rsvp_visibility, ...withoutVisibility } = VALID_INPUT;
    const result = createEventSchema.safeParse(withoutVisibility);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rsvp_visibility).toBe('public');
    }
  });

  it('defaults is_global to false when not provided', () => {
    const { is_global, ...withoutGlobal } = VALID_INPUT;
    const result = createEventSchema.safeParse(withoutGlobal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_global).toBe(false);
    }
  });

  it('accepts all valid event types', () => {
    const types = ['cultural', 'religious', 'social', 'career', 'other'];
    for (const event_type of types) {
      const result = createEventSchema.safeParse({ ...VALID_INPUT, event_type });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateEventSchema', () => {
  it('accepts a partial update with only title', () => {
    const result = updateEventSchema.safeParse({ title: 'New Title Here' });
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters even in update', () => {
    const result = updateEventSchema.safeParse({ title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no changes)', () => {
    const result = updateEventSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects description shorter than 10 characters in update', () => {
    const result = updateEventSchema.safeParse({ description: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('accepts only location_name update', () => {
    const result = updateEventSchema.safeParse({ location_name: 'New Venue Name' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid event_type in update', () => {
    const result = updateEventSchema.safeParse({ event_type: 'sports' });
    expect(result.success).toBe(false);
  });
});

describe('createEventSchema — edge cases', () => {
  it('rejects whitespace-only title (trim check)', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, title: '     ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('whitespace');
  });

  it('rejects whitespace-only description (trim check)', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, description: '          ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('whitespace');
  });

  it('rejects description longer than 3000 characters', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      description: 'A'.repeat(3001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description exactly 10 characters', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      description: '1234567890',
    });
    expect(result.success).toBe(true);
  });

  it('accepts title exactly 5 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, title: 'Hello' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid photo_url (non-URL string)', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      photo_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty string for photo_url', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, photo_url: '' });
    expect(result.success).toBe(true);
  });

  it('accepts valid HTTPS photo_url', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      photo_url: 'https://example.com/photo.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('accepts rsvp_visibility as private', () => {
    const result = createEventSchema.safeParse({
      ...VALID_INPUT,
      rsvp_visibility: 'private',
    });
    expect(result.success).toBe(true);
  });

  it('accepts is_global as true', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, is_global: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_global).toBe(true);
    }
  });

  it('accepts location_name exactly 5 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, location_name: 'Venue' });
    expect(result.success).toBe(true);
  });

  it('rejects location_name exactly 4 characters', () => {
    const result = createEventSchema.safeParse({ ...VALID_INPUT, location_name: 'Gym1' });
    expect(result.success).toBe(false);
  });
});
