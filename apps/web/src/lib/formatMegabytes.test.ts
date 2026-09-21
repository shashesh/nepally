import { describe, expect, it } from 'vitest';
import { formatMegabytes } from './formatMegabytes';

describe('formatMegabytes', () => {
  it('formats an exact megabyte count', () => {
    expect(formatMegabytes(15 * 1024 * 1024)).toBe('15MB');
  });

  it('rounds down just under a megabyte boundary', () => {
    expect(formatMegabytes(1.4 * 1024 * 1024)).toBe('1MB');
  });

  it('rounds up just over a megabyte boundary', () => {
    expect(formatMegabytes(1.6 * 1024 * 1024)).toBe('2MB');
  });

  it('handles zero bytes', () => {
    expect(formatMegabytes(0)).toBe('0MB');
  });
});
