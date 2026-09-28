import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ logClientEvent: vi.fn() }));

vi.mock('../utils/clientLogger', () => ({ logClientEvent: mocks.logClientEvent }));

import { cleanUpListingPhotos, droppedListingPhotoPaths } from './listingPhotoCleanup';

function buildClient(result: { data: unknown; error: Error | null }) {
  const remove = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ remove });
  const supabase = { storage: { from } } as unknown as SupabaseClient;
  return { supabase, remove, from };
}

const CONTEXT = { platform: 'mobile', userId: 'user-1', listingId: 'listing-1' };
const PUBLIC = 'https://abc.supabase.co/storage/v1/object/public/listing-photos';

describe('cleanUpListingPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the paths from the listing photos bucket and logs nothing when all go', async () => {
    const paths = ['user-1/a.jpg', 'user-1/b.jpg'];
    const { supabase, remove, from } = buildClient({
      data: paths.map((name) => ({ name })),
      error: null,
    });

    await cleanUpListingPhotos(supabase, paths, CONTEXT);

    expect(from).toHaveBeenCalledWith('listing-photos');
    expect(remove).toHaveBeenCalledWith(paths);
    expect(mocks.logClientEvent).not.toHaveBeenCalled();
  });

  it('skips storage for an empty list', async () => {
    const { supabase, remove } = buildClient({ data: [], error: null });

    await cleanUpListingPhotos(supabase, [], CONTEXT);

    expect(remove).not.toHaveBeenCalled();
  });

  it('logs the paths still in storage when some are not removed', async () => {
    const { supabase } = buildClient({ data: [{ name: 'user-1/a.jpg' }], error: null });

    await cleanUpListingPhotos(supabase, ['user-1/a.jpg', 'user-1/b.jpg'], CONTEXT);

    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'listing_photos_cleanup_failed',
        context: { ...CONTEXT, paths: ['user-1/b.jpg'] },
      })
    );
  });

  it('logs every path when storage refuses the delete', async () => {
    const { supabase } = buildClient({ data: null, error: new Error('denied') });

    await cleanUpListingPhotos(supabase, ['user-1/a.jpg'], CONTEXT);

    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ context: { ...CONTEXT, paths: ['user-1/a.jpg'] } })
    );
  });
});

describe('droppedListingPhotoPaths', () => {
  it('lists the storage paths of the photos no longer kept', () => {
    const original = [`${PUBLIC}/user-1/a.jpg`, `${PUBLIC}/user-1/b.jpg`, `${PUBLIC}/user-1/c.jpg`];
    const kept = [`${PUBLIC}/user-1/c.jpg`, `${PUBLIC}/user-1/a.jpg`];

    expect(droppedListingPhotoPaths(original, kept)).toEqual(['user-1/b.jpg']);
  });

  it('skips URLs that are not in the listing photos bucket', () => {
    expect(droppedListingPhotoPaths(['https://example.com/elsewhere.jpg'], [])).toEqual([]);
  });

  it('is empty when every photo is kept', () => {
    const original = [`${PUBLIC}/user-1/a.jpg`];
    expect(droppedListingPhotoPaths(original, original)).toEqual([]);
  });
});
