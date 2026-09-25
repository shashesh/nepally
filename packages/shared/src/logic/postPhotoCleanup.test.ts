import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ logClientEvent: vi.fn() }));

vi.mock('../utils/clientLogger', () => ({ logClientEvent: mocks.logClientEvent }));

import { cleanUpPostPhotos } from './postPhotoCleanup';

function buildClient(result: { data: unknown; error: Error | null }) {
  const remove = vi.fn().mockResolvedValue(result);
  const supabase = {
    storage: { from: vi.fn().mockReturnValue({ remove }) },
  } as unknown as SupabaseClient;
  return { supabase, remove };
}

const CONTEXT = { platform: 'web', userId: 'user-1', postId: 'post-1' };

describe('cleanUpPostPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the paths and logs nothing when every file is removed', async () => {
    const paths = ['user-1/a.jpg', 'user-1/b.jpg'];
    const { supabase, remove } = buildClient({
      data: paths.map((name) => ({ name })),
      error: null,
    });

    await cleanUpPostPhotos(supabase, paths, CONTEXT);

    expect(remove).toHaveBeenCalledWith(paths);
    expect(mocks.logClientEvent).not.toHaveBeenCalled();
  });

  it('skips storage for an empty list', async () => {
    const { supabase, remove } = buildClient({ data: [], error: null });

    await cleanUpPostPhotos(supabase, [], CONTEXT);

    expect(remove).not.toHaveBeenCalled();
    expect(mocks.logClientEvent).not.toHaveBeenCalled();
  });

  it('logs the paths left behind when storage removes fewer files than asked', async () => {
    const { supabase } = buildClient({ data: [], error: null });

    await cleanUpPostPhotos(supabase, ['user-1/a.jpg'], CONTEXT);

    expect(mocks.logClientEvent).toHaveBeenCalledTimes(1);
    expect(mocks.logClientEvent).toHaveBeenCalledWith({
      event: 'post_photos_cleanup_failed',
      error: expect.objectContaining({ message: 'Removed 0 of 1 files from post-photos' }),
      context: { ...CONTEXT, paths: ['user-1/a.jpg'] },
    });
  });

  it('logs only the paths still in storage after a partial delete', async () => {
    const { supabase } = buildClient({ data: [{ name: 'user-1/a.jpg' }], error: null });

    await cleanUpPostPhotos(supabase, ['user-1/a.jpg', 'user-1/b.jpg'], CONTEXT);

    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ context: { ...CONTEXT, paths: ['user-1/b.jpg'] } })
    );
  });

  it('logs when storage returns an error', async () => {
    const { supabase } = buildClient({ data: null, error: new Error('storage unavailable') });

    await cleanUpPostPhotos(supabase, ['user-1/a.jpg'], CONTEXT);

    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'post_photos_cleanup_failed',
        error: expect.objectContaining({ message: 'storage unavailable' }),
      })
    );
  });
});
