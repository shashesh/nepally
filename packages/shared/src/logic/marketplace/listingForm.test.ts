import { describe, expect, it } from 'vitest';
import { createListingSchema } from '../../validation/marketplace';
import {
  buildListingFormInput,
  isSameListingForm,
  listingFieldErrors,
  withUrlScheme,
  type ListingFormFields,
} from './listingForm';

const BUSINESS: ListingFormFields = {
  listing_type: 'business',
  title: 'Momo catering',
  description: 'Fresh momos for parties and events.',
  category_id: '11111111-1111-4111-8111-111111111111',
  price: '$50/tray',
  business_name: 'Himalayan Kitchen',
  address: '12 Main St',
  phone: '555-0100',
  email: 'hi@example.com',
  website_url: 'https://example.com',
  item_condition: 'used',
};

describe('withUrlScheme', () => {
  it('adds https:// to an address typed without a scheme', () => {
    expect(withUrlScheme('www.mybiz.com')).toBe('https://www.mybiz.com');
  });

  it('keeps an address that already has a scheme', () => {
    expect(withUrlScheme('http://mybiz.com')).toBe('http://mybiz.com');
    expect(withUrlScheme('HTTPS://mybiz.com')).toBe('HTTPS://mybiz.com');
  });

  it('trims, and leaves a blank address blank', () => {
    expect(withUrlScheme('  mybiz.com  ')).toBe('https://mybiz.com');
    expect(withUrlScheme('   ')).toBe('');
  });
});

describe('buildListingFormInput', () => {
  it('keeps a business listing as typed', () => {
    expect(buildListingFormInput(BUSINESS)).toEqual({ ...BUSINESS, item_condition: undefined });
  });

  it('drops the business fields from an individual listing', () => {
    const input = buildListingFormInput({ ...BUSINESS, listing_type: 'individual' });
    expect(input.business_name).toBeUndefined();
    expect(input.address).toBeUndefined();
    expect(input.website_url).toBeUndefined();
    expect(input.item_condition).toBe('used');
  });

  it('drops the condition from a business listing', () => {
    expect(buildListingFormInput(BUSINESS).item_condition).toBeUndefined();
  });

  it('still sends every field, so an edit clears the ones left out', () => {
    // updateListing stores null for a key that is present but undefined.
    const input = buildListingFormInput({ ...BUSINESS, listing_type: 'individual', phone: '' });
    for (const key of [
      'price',
      'business_name',
      'address',
      'phone',
      'email',
      'website_url',
      'item_condition',
    ]) {
      expect(key in input).toBe(true);
    }
    expect(input.phone).toBeUndefined();
  });

  it('turns blank optional fields into undefined and trims the rest', () => {
    const input = buildListingFormInput({ ...BUSINESS, price: '  ', email: ' hi@example.com ' });
    expect(input.price).toBeUndefined();
    expect(input.email).toBe('hi@example.com');
  });

  it('adds https:// to the website', () => {
    const input = buildListingFormInput({ ...BUSINESS, website_url: 'www.mybiz.com' });
    expect(input.website_url).toBe('https://www.mybiz.com');
  });

  it('passes the schema once the website has a scheme', () => {
    const input = buildListingFormInput({ ...BUSINESS, website_url: 'www.mybiz.com' });
    expect(createListingSchema.safeParse({ ...input, photos: [] }).success).toBe(true);
  });
});

describe('listingFieldErrors', () => {
  it('maps each issue to its field', () => {
    expect(
      listingFieldErrors([
        { path: ['email'], message: 'Invalid email address' },
        { path: ['website_url'], message: 'Invalid URL' },
      ])
    ).toEqual({ email: 'Invalid email address', website_url: 'Invalid URL' });
  });

  it('keeps the first message when a field has several', () => {
    expect(
      listingFieldErrors([
        { path: ['title'], message: 'Title must be at least 5 characters' },
        { path: ['title'], message: 'Title cannot be only whitespace' },
      ])
    ).toEqual({ title: 'Title must be at least 5 characters' });
  });

  it('files an issue with no path under form', () => {
    expect(listingFieldErrors([{ path: [], message: 'Something is wrong' }])).toEqual({
      form: 'Something is wrong',
    });
  });
});

describe('isSameListingForm', () => {
  it('is true for the same values', () => {
    expect(isSameListingForm(BUSINESS, { ...BUSINESS })).toBe(true);
  });

  it('is false once any field changes', () => {
    expect(isSameListingForm(BUSINESS, { ...BUSINESS, title: 'Momo catering!' })).toBe(false);
    expect(isSameListingForm(BUSINESS, { ...BUSINESS, item_condition: 'new' })).toBe(false);
  });
});
