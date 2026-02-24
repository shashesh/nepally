import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocodeToZip } from './location';

describe('reverseGeocodeToZip', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ZIP code when API responds with postcode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: { postcode: '75001' },
        }),
      })
    );

    const result = await reverseGeocodeToZip({
      latitude: 32.95,
      longitude: -96.83,
      accuracy: 15,
    });

    expect(result).toBe('75001');
  });

  it('returns null when request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );

    const result = await reverseGeocodeToZip({
      latitude: 40.71,
      longitude: -74.0,
      accuracy: 10,
    });

    expect(result).toBeNull();
  });
});
