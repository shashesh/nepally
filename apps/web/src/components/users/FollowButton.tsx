import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@mantine/core';
import { followUser, unfollowUser, isFollowing } from '@nepally/shared';
import { notify } from '../ui';
import styles from './FollowButton.module.css';

interface Props {
  supabase: SupabaseClient;
  viewerId: string | null;
  targetUserId: string;
  onChange?: (nowFollowing: boolean) => void;
}

export function FollowButton({ supabase, viewerId, targetUserId, onChange }: Props) {
  // The viewer/target pair whose follow-status lookup has finished, and whether it failed.
  // `loading` is derived from it, so it is true until the status for the *current* pair arrives
  // (e.g. when viewerId resolves after mount or the target user changes).
  const [loadedFor, setLoadedFor] = useState<{
    viewerId: string;
    targetUserId: string;
    failed: boolean;
  } | null>(null);
  const [following, setFollowing] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);

  // `toggle()` is async, and pages such as /users/[id] keep this component mounted across a
  // profile navigation, so a toggle started for one target can resolve after the props have
  // moved on to another. This ref tracks the pair currently being displayed so that stale
  // continuation can detect it no longer applies; it's written from an effect, never during
  // render, per the rules-of-hooks/react-compiler ref rules.
  const currentPairRef = useRef<{ viewerId: string | null; targetUserId: string }>({
    viewerId,
    targetUserId,
  });
  useEffect(() => {
    currentPairRef.current = { viewerId, targetUserId };
  }, [viewerId, targetUserId]);

  // A pending toggle belongs to the pair it started for, so a new pair must not inherit it —
  // otherwise it would look permanently disabled once its own status loads. react-hooks/
  // set-state-in-effect forbids calling setState directly in an effect body, so this uses
  // React's documented "adjusting state when a prop changes" pattern instead: compare against
  // the pair from the last render and reset synchronously, during render, when it differs.
  const [togglingPair, setTogglingPair] = useState({ viewerId, targetUserId });
  if (togglingPair.viewerId !== viewerId || togglingPair.targetUserId !== targetUserId) {
    setTogglingPair({ viewerId, targetUserId });
    setToggling(false);
  }

  useEffect(() => {
    if (!viewerId || viewerId === targetUserId) return;
    let cancelled = false;
    (async () => {
      const res = await isFollowing(supabase, viewerId, targetUserId);
      if (!cancelled) {
        if (!res.error) setFollowing(Boolean(res.data));
        setLoadedFor({ viewerId, targetUserId, failed: Boolean(res.error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewerId, targetUserId]);

  if (!viewerId || viewerId === targetUserId) return null;

  const loadedCurrentPair =
    loadedFor?.viewerId === viewerId && loadedFor?.targetUserId === targetUserId;
  // Without a known follow status the button can't truthfully offer "Follow" or "Following".
  if (loadedCurrentPair && loadedFor?.failed) return null;

  // Only the initial status fetch has no truthful label to show, so only it earns the
  // native `disabled` attribute. Mid-toggle the button already has an optimistic label
  // ("Follow"/"Following") and must stay focusable and show that label at full opacity
  // (not Mantine's grey disabled look): native `disabled` on the focused element would
  // push focus to <body>, so toggling is conveyed with aria-disabled alone, while
  // `toggle` ignores repeat clicks.
  const initialLoading = !loadedCurrentPair;
  const loading = toggling || initialLoading;

  const toggle = async () => {
    if (loading) return;
    const pair = { viewerId, targetUserId };
    setToggling(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);

    // The pair may have moved on (e.g. the page navigated to a different profile) while this
    // request was in flight. Its result no longer describes what's on screen, so don't touch it.
    const isStale =
      currentPairRef.current.viewerId !== pair.viewerId ||
      currentPairRef.current.targetUserId !== pair.targetUserId;
    if (isStale) return;

    if (res.error) {
      setFollowing(prev);
      notify.error("Couldn't update follow. Please try again.");
    } else {
      onChange?.(!prev);
    }
    setToggling(false);
  };

  return (
    <Button
      type="button"
      data-testid="follow-button"
      aria-pressed={loadedCurrentPair ? following : undefined}
      aria-label={initialLoading ? 'Loading follow status' : undefined}
      aria-disabled={toggling ? true : undefined}
      className={styles.root}
      variant={following ? 'default' : 'filled'}
      radius="var(--radius-full)"
      size="sm"
      disabled={initialLoading}
      onClick={toggle}
    >
      {initialLoading ? '…' : following ? 'Following' : 'Follow'}
    </Button>
  );
}
