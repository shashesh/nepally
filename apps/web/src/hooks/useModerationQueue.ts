import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPendingPosts,
  getPostsByIds,
  listReports,
  resolveReport,
  setPostModerationStatus,
  setUserBanStatus,
} from '@nepally/shared';
import type { ModerationPostStatus, Post, ReportWithUsers, ResolveReportInput } from '@nepally/shared';
import { supabase } from '../lib/supabase';

export type ModerationResult = { ok: true } | { ok: false; message: string };
export type ModerationAction = 'approve' | 'remove' | 'dismiss' | 'remove-post' | 'ban';

export interface ModerationQueueState {
  pendingPosts: Post[];
  reports: ReportWithUsers[];
  /** Posts named by post reports, by id. A missing id means the post is gone. */
  reportedPosts: Readonly<Record<string, Post>>;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** The card and action in flight; null when idle. One action at a time. */
  busy: { id: string; action: ModerationAction } | null;
  approvePost: (post: Post) => Promise<ModerationResult>;
  removePost: (post: Post) => Promise<ModerationResult>;
  dismissReport: (report: ReportWithUsers) => Promise<ModerationResult>;
  removeReportedPost: (report: ReportWithUsers) => Promise<ModerationResult>;
  banUser: (report: ReportWithUsers, targetUserId: string) => Promise<ModerationResult>;
}

const LOAD_ERROR = "Couldn't load the moderation queue.";
const OK: ModerationResult = { ok: true };

/**
 * Sentences for each failure. Raw PostgREST text ("permission denied for
 * table posts") never reaches a moderator's toast.
 */
const FAILED = {
  approve: "Couldn't approve the post. Please try again.",
  remove: "Couldn't remove the post. Please try again.",
  closeAfterRemove: "The post was removed, but the report couldn't be closed. Please try again.",
  dismiss: "Couldn't dismiss the report. Please try again.",
  ban: "Couldn't ban this member. Please try again.",
  closeAfterBan: "The member was banned, but the report couldn't be closed. Please try again.",
  busy: 'Another action is still running.',
} as const;

function failed(message: string): ModerationResult {
  return { ok: false, message };
}

interface Queue {
  pendingPosts: Post[];
  reports: ReportWithUsers[];
  reportedPosts: Record<string, Post>;
}

const EMPTY_QUEUE: Queue = { pendingPosts: [], reports: [], reportedPosts: {} };

/** Null when any of the three requests failed: the queue fails as a whole. */
async function fetchQueue(): Promise<Queue | null> {
  const [postsResult, reportsResult] = await Promise.all([
    getPendingPosts(supabase),
    listReports(supabase, { status: 'pending' }),
  ]);
  if (postsResult.error || reportsResult.error) return null;

  const reports = reportsResult.data ?? [];
  // One batched query for every reported post, so a card can show its title
  // and offer "Ban author" without leaving the page.
  const postIds = Array.from(new Set(reports.filter((r) => r.target_type === 'post').map((r) => r.target_id)));
  const reportedResult = await getPostsByIds(supabase, postIds);
  if (reportedResult.error) return null;

  return {
    pendingPosts: postsResult.data ?? [],
    reports,
    reportedPosts: Object.fromEntries((reportedResult.data ?? []).map((p) => [p.id, p])),
  };
}

/**
 * The moderator queue: posts waiting for review and open reports, with the
 * actions a moderator takes on them. Actions run one at a time, so two can't
 * race on the same rows; each resolves to a result the page turns into a toast.
 */
export function useModerationQueue(moderatorId: string | null): ModerationQueueState {
  const [queue, setQueue] = useState<Queue>(EMPTY_QUEUE);
  const [loading, setLoading] = useState(Boolean(moderatorId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ModerationQueueState['busy']>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped by each load; results started under an older one are dropped.
  const generationRef = useRef(0);
  // State lags a render, so a second press in the same tick needs the ref.
  const busyRef = useRef(false);

  // A different moderator starts from nothing (react.dev: adjusting state when a prop changes).
  const [loadedId, setLoadedId] = useState(moderatorId);
  if (moderatorId !== loadedId) {
    setLoadedId(moderatorId);
    setQueue(EMPTY_QUEUE);
    setLoading(Boolean(moderatorId));
    setError(null);
  }

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!moderatorId) return;
    void fetchQueue().then((result) => {
      if (generation !== generationRef.current) return;
      setQueue(result ?? EMPTY_QUEUE);
      setError(result ? null : LOAD_ERROR);
      setLoading(false);
    });
  }, [moderatorId, reloadKey]);

  const reload = useCallback(() => {
    setQueue(EMPTY_QUEUE);
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  /** Runs one action under the one-at-a-time guard; `apply` patches the queue on success. */
  const perform = useCallback(
    async (
      id: string,
      action: ModerationAction,
      work: () => Promise<{ result: ModerationResult; apply?: (current: Queue) => Queue }>
    ): Promise<ModerationResult> => {
      if (busyRef.current) return failed(FAILED.busy);
      busyRef.current = true;
      setBusy({ id, action });
      const generation = generationRef.current;
      try {
        const { result, apply } = await work();
        if (apply && generation === generationRef.current) setQueue(apply);
        return result;
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    []
  );

  const closeReport = useCallback(
    async (report: ReportWithUsers, input: Omit<ResolveReportInput, 'reviewed_by'>) => {
      const { error: closeError } = await resolveReport(supabase, report.id, {
        ...input,
        reviewed_by: moderatorId ?? '',
      });
      return !closeError;
    },
    [moderatorId]
  );

  const decidePost = useCallback(
    (post: Post, status: ModerationPostStatus, action: ModerationAction, message: string) =>
      perform(post.id, action, async () => {
        const { error: statusError } = await setPostModerationStatus(supabase, post.id, status);
        if (statusError) return { result: failed(message) };
        return {
          result: OK,
          apply: (current) => ({ ...current, pendingPosts: current.pendingPosts.filter((p) => p.id !== post.id) }),
        };
      }),
    [perform]
  );

  const approvePost = useCallback((post: Post) => decidePost(post, 'active', 'approve', FAILED.approve), [decidePost]);
  const removePost = useCallback((post: Post) => decidePost(post, 'removed', 'remove', FAILED.remove), [decidePost]);

  const dropReport = (reportId: string) => (current: Queue) => ({
    ...current,
    reports: current.reports.filter((r) => r.id !== reportId),
  });

  const dismissReport = useCallback(
    (report: ReportWithUsers) =>
      perform(report.id, 'dismiss', async () => {
        const closed = await closeReport(report, { status: 'dismissed', action: 'none' });
        return closed ? { result: OK, apply: dropReport(report.id) } : { result: failed(FAILED.dismiss) };
      }),
    [perform, closeReport]
  );

  const removeReportedPost = useCallback(
    (report: ReportWithUsers) =>
      perform(report.id, 'remove-post', async () => {
        const { error: statusError } = await setPostModerationStatus(supabase, report.target_id, 'removed');
        if (statusError) return { result: failed(FAILED.remove) };

        // The same post can also be waiting in pending posts (a reported
        // Emergency submission); it is gone now either way.
        const withoutPost = (current: Queue): Queue => ({
          ...current,
          pendingPosts: current.pendingPosts.filter((p) => p.id !== report.target_id),
        });
        const closed = await closeReport(report, { status: 'actioned', action: 'removed' });
        if (!closed) return { result: failed(FAILED.closeAfterRemove), apply: withoutPost };
        return { result: OK, apply: (current) => dropReport(report.id)(withoutPost(current)) };
      }),
    [perform, closeReport]
  );

  const banUser = useCallback(
    (report: ReportWithUsers, targetUserId: string) =>
      perform(report.id, 'ban', async () => {
        const { error: banError } = await setUserBanStatus(supabase, targetUserId, true, report.reason);
        if (banError) return { result: failed(FAILED.ban) };

        // moderate_user() removes the member's pending posts server-side.
        const withoutTheirPosts = (current: Queue): Queue => ({
          ...current,
          pendingPosts: current.pendingPosts.filter((p) => p.author_id !== targetUserId),
        });
        const closed = await closeReport(report, { status: 'actioned', action: 'banned' });
        if (!closed) return { result: failed(FAILED.closeAfterBan), apply: withoutTheirPosts };
        return { result: OK, apply: (current) => dropReport(report.id)(withoutTheirPosts(current)) };
      }),
    [perform, closeReport]
  );

  const hasModerator = Boolean(moderatorId);
  return {
    pendingPosts: queue.pendingPosts,
    reports: queue.reports,
    reportedPosts: queue.reportedPosts,
    loading: hasModerator && loading,
    error,
    reload,
    busy,
    approvePost,
    removePost,
    dismissReport,
    removeReportedPost,
    banUser,
  };
}
