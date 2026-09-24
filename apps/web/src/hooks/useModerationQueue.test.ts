import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPendingPosts,
  getPostsByIds,
  listReports,
  resolveReport,
  setPostModerationStatus,
  setUserBanStatus,
  type Post,
  type ReportWithUsers,
} from '@nepally/shared';
import { useModerationQueue, type ModerationResult } from './useModerationQueue';

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getPendingPosts: vi.fn(),
  listReports: vi.fn(),
  getPostsByIds: vi.fn(),
  setPostModerationStatus: vi.fn(),
  resolveReport: vi.fn(),
  setUserBanStatus: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

const mockPending = getPendingPosts as ReturnType<typeof vi.fn>;
const mockReports = listReports as ReturnType<typeof vi.fn>;
const mockPostsByIds = getPostsByIds as ReturnType<typeof vi.fn>;
const mockStatus = setPostModerationStatus as ReturnType<typeof vi.fn>;
const mockResolve = resolveReport as ReturnType<typeof vi.fn>;
const mockBan = setUserBanStatus as ReturnType<typeof vi.fn>;

function post(id: string, authorId = 'author-1'): Post {
  return { id, author_id: authorId, title: `Post ${id}` } as unknown as Post;
}

function report(id: string, overrides: Partial<ReportWithUsers> = {}): ReportWithUsers {
  return { id, target_type: 'post', target_id: 'p-reported', reason: 'Spam', ...overrides } as unknown as ReportWithUsers;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function loaded() {
  const hook = renderHook(({ id }: { id: string | null }) => useModerationQueue(id), { initialProps: { id: 'mod-1' } });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

async function run(action: () => Promise<ModerationResult>): Promise<ModerationResult> {
  let result!: ModerationResult;
  await act(async () => {
    result = await action();
  });
  return result;
}

describe('useModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPending.mockResolvedValue({ data: [post('p1'), post('p2', 'author-2')] });
    mockReports.mockResolvedValue({
      data: [
        report('r1'),
        report('r2', { target_id: 'p-reported' }),
        report('r3', { target_type: 'user', target_id: 'author-2' }),
      ],
    });
    mockPostsByIds.mockResolvedValue({ data: [post('p-reported', 'author-1')] });
    mockStatus.mockResolvedValue({ data: {} });
    mockResolve.mockResolvedValue({ data: {} });
    mockBan.mockResolvedValue({ data: {} });
  });

  it('loads pending posts, open reports, and the reported posts once each', async () => {
    const { result } = await loaded();

    expect(mockReports).toHaveBeenCalledWith({}, { status: 'pending' });
    expect(mockPostsByIds).toHaveBeenCalledWith({}, ['p-reported']);
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.current.reports.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(Object.keys(result.current.reportedPosts)).toEqual(['p-reported']);
    expect(result.current.error).toBeNull();
  });

  it.each([
    ['pending posts', () => mockPending.mockResolvedValueOnce({ error: new Error('down') })],
    ['reports', () => mockReports.mockResolvedValueOnce({ error: new Error('down') })],
    ['reported posts', () => mockPostsByIds.mockResolvedValueOnce({ error: new Error('down') })],
  ])('fails as a whole when %s fail to load, and reloads', async (_what, fail) => {
    fail();
    const { result } = await loaded();

    expect(result.current.error).toBe("Couldn't load the moderation queue.");
    expect(result.current.pendingPosts).toEqual([]);
    expect(result.current.reports).toEqual([]);
    expect(result.current.reportedPosts).toEqual({});

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.reports).toHaveLength(3);
  });

  it('loads nothing for a non-moderator', () => {
    const { result } = renderHook(() => useModerationQueue(null));

    expect(result.current.loading).toBe(false);
    expect(mockPending).not.toHaveBeenCalled();
  });

  it('approves a post and drops it from the queue', async () => {
    const { result } = await loaded();

    const outcome = await run(() => result.current.approvePost(result.current.pendingPosts[0]));

    expect(outcome).toEqual({ ok: true });
    expect(mockStatus).toHaveBeenCalledWith({}, 'p1', 'active');
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p2']);
  });

  it('keeps the post and says so when approving fails', async () => {
    mockStatus.mockResolvedValueOnce({ error: new Error('permission denied for table posts') });
    const { result } = await loaded();

    const outcome = await run(() => result.current.approvePost(result.current.pendingPosts[0]));

    expect(outcome).toEqual({ ok: false, message: "Couldn't approve the post. Please try again." });
    expect(result.current.pendingPosts).toHaveLength(2);
  });

  it('removes a pending post', async () => {
    const { result } = await loaded();

    const outcome = await run(() => result.current.removePost(result.current.pendingPosts[1]));

    expect(outcome).toEqual({ ok: true });
    expect(mockStatus).toHaveBeenCalledWith({}, 'p2', 'removed');
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1']);
  });

  it('dismisses a report', async () => {
    const { result } = await loaded();

    const outcome = await run(() => result.current.dismissReport(result.current.reports[0]));

    expect(outcome).toEqual({ ok: true });
    expect(mockResolve).toHaveBeenCalledWith({}, 'r1', { status: 'dismissed', reviewed_by: 'mod-1', action: 'none' });
    expect(result.current.reports.map((r) => r.id)).toEqual(['r2', 'r3']);
  });

  it('says so when dismissing fails', async () => {
    mockResolve.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    const outcome = await run(() => result.current.dismissReport(result.current.reports[0]));

    expect(outcome).toEqual({ ok: false, message: "Couldn't dismiss the report. Please try again." });
    expect(result.current.reports).toHaveLength(3);
  });

  it('removes a reported post, dropping it from pending posts too, and closes the report', async () => {
    mockPending.mockResolvedValue({ data: [post('p1'), post('p-reported')] });
    const { result } = await loaded();

    const outcome = await run(() => result.current.removeReportedPost(result.current.reports[0]));

    expect(outcome).toEqual({ ok: true });
    expect(mockStatus).toHaveBeenCalledWith({}, 'p-reported', 'removed');
    expect(mockResolve).toHaveBeenCalledWith({}, 'r1', { status: 'actioned', reviewed_by: 'mod-1', action: 'removed' });
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1']);
    expect(result.current.reports.map((r) => r.id)).toEqual(['r2', 'r3']);
  });

  it('keeps the report when the post was removed but closing it failed', async () => {
    mockPending.mockResolvedValue({ data: [post('p1'), post('p-reported')] });
    mockResolve.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    const outcome = await run(() => result.current.removeReportedPost(result.current.reports[0]));

    expect(outcome).toEqual({
      ok: false,
      message: "The post was removed, but the report couldn't be closed. Please try again.",
    });
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1']);
    expect(result.current.reports).toHaveLength(3);
  });

  it('does not close the report when removing its post fails', async () => {
    mockStatus.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    const outcome = await run(() => result.current.removeReportedPost(result.current.reports[0]));

    expect(outcome).toEqual({ ok: false, message: "Couldn't remove the post. Please try again." });
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it('bans a member, closes the report, and drops their pending posts', async () => {
    const { result } = await loaded();

    const outcome = await run(() => result.current.banUser(result.current.reports[2], 'author-2'));

    expect(outcome).toEqual({ ok: true });
    expect(mockBan).toHaveBeenCalledWith({}, 'author-2', true, 'Spam');
    expect(mockResolve).toHaveBeenCalledWith({}, 'r3', { status: 'actioned', reviewed_by: 'mod-1', action: 'banned' });
    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1']);
    expect(result.current.reports.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('says which step failed when banning', async () => {
    mockBan.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    expect(await run(() => result.current.banUser(result.current.reports[2], 'author-2'))).toEqual({
      ok: false,
      message: "Couldn't ban this member. Please try again.",
    });
    expect(mockResolve).not.toHaveBeenCalled();

    mockResolve.mockResolvedValueOnce({ error: new Error('down') });
    expect(await run(() => result.current.banUser(result.current.reports[2], 'author-2'))).toEqual({
      ok: false,
      message: "The member was banned, but the report couldn't be closed. Please try again.",
    });
  });

  it('runs one action at a time and reports which one is running', async () => {
    const pending = deferred<{ data: object }>();
    mockStatus.mockReturnValueOnce(pending.promise);
    const { result } = await loaded();

    let first!: Promise<ModerationResult>;
    act(() => {
      first = result.current.approvePost(result.current.pendingPosts[0]);
    });
    expect(result.current.busy).toEqual({ id: 'p1', action: 'approve' });

    const second = await run(() => result.current.dismissReport(result.current.reports[0]));
    expect(second).toEqual({ ok: false, message: 'Another action is still running.' });
    expect(mockResolve).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ data: {} });
      await first;
    });
    expect(result.current.busy).toBeNull();
  });

  it('names the report as the busy card for a ban', async () => {
    const pending = deferred<{ data: object }>();
    mockBan.mockReturnValueOnce(pending.promise);
    const { result } = await loaded();

    let ban!: Promise<ModerationResult>;
    act(() => {
      ban = result.current.banUser(result.current.reports[2], 'author-2');
    });
    expect(result.current.busy).toEqual({ id: 'r3', action: 'ban' });

    await act(async () => {
      pending.resolve({ data: {} });
      await ban;
    });
  });

  it('drops a late load after a reload', async () => {
    const late = deferred<{ data: Post[] }>();
    mockPending.mockReturnValueOnce(late.promise);
    const { result } = renderHook(() => useModerationQueue('mod-1'));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      late.resolve({ data: [post('stale')] });
    });

    expect(result.current.pendingPosts.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});
