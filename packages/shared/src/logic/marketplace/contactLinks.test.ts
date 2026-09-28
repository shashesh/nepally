import { describe, expect, it } from 'vitest';
import { toMailtoUrl, toMapsUrls, toTelUrl, toWebsiteUrl } from './contactLinks';

describe('toTelUrl', () => {
  it('keeps only the digits of a formatted US number', () => {
    expect(toTelUrl('(555) 010-0199')).toBe('tel:5550100199');
  });

  it('keeps a leading plus for an international number', () => {
    expect(toTelUrl('+1 555 010 0199')).toBe('tel:+15550100199');
  });

  it('drops a plus that is not at the start', () => {
    expect(toTelUrl('555+0100')).toBe('tel:5550100');
  });

  it('returns null when there are no digits', () => {
    expect(toTelUrl('call me')).toBeNull();
    expect(toTelUrl('')).toBeNull();
  });
});

describe('toMailtoUrl', () => {
  it('builds a mailto URL from a trimmed address', () => {
    expect(toMailtoUrl('  shop@example.com ')).toBe('mailto:shop@example.com');
  });

  it('returns null for something that is not an email address', () => {
    expect(toMailtoUrl('not an email')).toBeNull();
    expect(toMailtoUrl('')).toBeNull();
  });
});

describe('toWebsiteUrl', () => {
  it('keeps an https URL as it is', () => {
    expect(toWebsiteUrl('https://momo.example.com/menu')).toBe('https://momo.example.com/menu');
  });

  it('keeps an http URL as it is', () => {
    expect(toWebsiteUrl('http://momo.example.com')).toBe('http://momo.example.com');
  });

  it('adds https to an address typed without a scheme', () => {
    expect(toWebsiteUrl('www.momo.example.com')).toBe('https://www.momo.example.com');
  });

  it('refuses any scheme other than http and https', () => {
    expect(toWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(toWebsiteUrl('ftp://files.example.com')).toBeNull();
    expect(toWebsiteUrl('tel:5550100')).toBeNull();
  });

  it('returns null for an empty value', () => {
    expect(toWebsiteUrl('   ')).toBeNull();
  });
});

describe('toMapsUrls', () => {
  it('builds the Apple, geo and Google Maps URLs for an address', () => {
    expect(toMapsUrls('123 Main St, Queens, NY')).toEqual({
      apple: 'maps:?q=123%20Main%20St%2C%20Queens%2C%20NY',
      geo: 'geo:0,0?q=123%20Main%20St%2C%20Queens%2C%20NY',
      google: 'https://www.google.com/maps/search/?api=1&query=123%20Main%20St%2C%20Queens%2C%20NY',
    });
  });

  it('encodes characters that would break the query', () => {
    expect(toMapsUrls('Suite #4 & 5').google).toBe(
      'https://www.google.com/maps/search/?api=1&query=Suite%20%234%20%26%205'
    );
  });

  it('returns null for an empty address', () => {
    expect(toMapsUrls('  ')).toBeNull();
  });
});
