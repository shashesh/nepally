import { describe, expect, it } from 'vitest';
import { listingInquiryDraft } from './inquiry';

describe('listingInquiryDraft', () => {
  it('names the listing so the seller knows which one the buyer means', () => {
    expect(listingInquiryDraft('Rice cooker')).toBe('Hi, is “Rice cooker” still available?');
  });

  it('trims the title', () => {
    expect(listingInquiryDraft('  Rice cooker ')).toBe('Hi, is “Rice cooker” still available?');
  });
});
