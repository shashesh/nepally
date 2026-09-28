import { describe, expect, it } from 'vitest';
import { listingWebUrl } from './share';

describe('listingWebUrl', () => {
  it("links to the listing's page on the web", () => {
    expect(listingWebUrl('abc-123')).toBe('https://nepally.us/marketplace/listing/abc-123');
  });

  it('encodes the id', () => {
    expect(listingWebUrl('a/b')).toBe('https://nepally.us/marketplace/listing/a%2Fb');
  });
});
