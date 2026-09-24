import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, getUserSettings, upsertUserSettings, type UserSettings } from '@nepally/shared';
import { useUserSettings } from './useUserSettings';

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserSettings: vi.fn(),
  upsertUserSettings: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

const mockGet = getUserSettings as ReturnType<typeof vi.fn>;
const mockUpsert = upsertUserSettings as ReturnType<typeof vi.fn>;

const ROW: UserSettings = {
  user_id: 'user-1',
  email_notifications: false,
  push_notifications: false,
  emergency_alerts: true,
  metro_area_alerts: false,
  notify_chat: 'batched',
  notify_comments: false,
  notify_likes: 'all',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
};

const VALUES = {
  email_notifications: false,
  push_notifications: false,
  emergency_alerts: true,
  metro_area_alerts: false,
  notify_chat: 'batched',
  notify_comments: false,
  notify_likes: 'all',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function loaded() {
  const hook = renderHook(({ id }: { id: string | null }) => useUserSettings(id), { initialProps: { id: 'user-1' } });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useUserSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: ROW });
    mockUpsert.mockResolvedValue({});
  });

  it('loads only the editable fields of the row', async () => {
    const { result } = await loaded();

    expect(mockGet).toHaveBeenCalledWith({}, 'user-1');
    expect(result.current.values).toEqual(VALUES);
    expect(result.current.error).toBeNull();
  });

  it('starts from the defaults when the member has no row yet', async () => {
    mockGet.mockResolvedValue({ data: undefined });
    const { result } = await loaded();

    expect(result.current.values).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('has no values after a failed load, and reloads', async () => {
    mockGet.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    expect(result.current.error).toBe("Couldn't load your notification preferences.");
    expect(result.current.values).toBeNull();

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.values).toEqual(VALUES);
  });

  it('changes one field at a time', async () => {
    const { result } = await loaded();

    act(() => result.current.setValue('notify_likes', 'off'));

    expect(result.current.values).toEqual({ ...VALUES, notify_likes: 'off' });
  });

  it('saves the edited values', async () => {
    const { result } = await loaded();
    act(() => result.current.setValue('notify_comments', true));

    let ok = false;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({}, 'user-1', { ...VALUES, notify_comments: true });
    expect(result.current.saving).toBe(false);
  });

  it('keeps the edits when saving fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();
    act(() => result.current.setValue('notify_chat', 'off'));

    let ok = true;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    expect(result.current.values?.notify_chat).toBe('off');
  });

  it('sends one save while one is in flight', async () => {
    const pending = deferred<object>();
    mockUpsert.mockReturnValueOnce(pending.promise);
    const { result } = await loaded();

    let first!: Promise<boolean>;
    let second = true;
    await act(async () => {
      first = result.current.save();
      second = await result.current.save();
    });
    expect(result.current.saving).toBe(true);
    expect(second).toBe(false);

    await act(async () => {
      pending.resolve({});
      await first;
    });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });

  it('saves nothing it did not load', async () => {
    mockGet.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    let ok = true;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('starts over for a different member and drops the previous member’s late answer', async () => {
    const late = deferred<{ data: UserSettings }>();
    mockGet.mockReturnValueOnce(late.promise);
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useUserSettings(id), {
      initialProps: { id: 'user-1' },
    });

    mockGet.mockResolvedValueOnce({ data: { ...ROW, user_id: 'user-2', notify_likes: 'off' } });
    rerender({ id: 'user-2' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      late.resolve({ data: ROW });
    });
    expect(result.current.values?.notify_likes).toBe('off');
  });

  it('loads nothing without a member', () => {
    const { result } = renderHook(() => useUserSettings(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.values).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
