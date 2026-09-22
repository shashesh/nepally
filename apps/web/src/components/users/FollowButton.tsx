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

export function FollowButton(props: Props) {
  const { viewerId, targetUserId } = props;
  if (!viewerId || viewerId === targetUserId) return null;
  // One instance per viewer/target pair: moving to another profile remounts it,
  // so no loaded status or in-flight toggle carries over.
  return <FollowToggle key={`${viewerId}:${targetUserId}`} {...props} viewerId={viewerId} />;
}

interface ToggleProps {
  supabase: SupabaseClient;
  viewerId: string;
  targetUserId: string;
  onChange?: (nowFollowing: boolean) => void;
}

function FollowToggle({ supabase, viewerId, targetUserId, onChange }: ToggleProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  // A remount (new key) makes a stale request's setState a no-op, but onChange is a caller
  // side effect React can't silence for us — firing it after unmount would credit the wrong
  // profile. Set true in the effect body, not just its cleanup, so it's correct under
  // StrictMode's double mount too.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await isFollowing(supabase, viewerId, targetUserId);
      if (!cancelled) {
        if (!res.error) setFollowing(Boolean(res.data));
        setStatus(res.error ? 'failed' : 'ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewerId, targetUserId]);

  // Without a known follow status the button can't truthfully offer "Follow" or "Following".
  if (status === 'failed') return null;

  // Only the initial status fetch has no truthful label to show, so only it earns the
  // native `disabled` attribute. Mid-toggle the button already has an optimistic label
  // ("Follow"/"Following") and must stay focusable and show that label at full opacity
  // (not Mantine's grey disabled look): native `disabled` on the focused element would
  // push focus to <body>, so toggling is conveyed with aria-disabled alone, while
  // `toggle` ignores repeat clicks.
  const initialLoading = status === 'loading';
  const loading = toggling || initialLoading;

  const toggle = async () => {
    if (loading) return;
    setToggling(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);

    if (res.error) {
      setFollowing(prev);
      // The follow/unfollow really did fail, even if the viewer has since moved on — never
      // swallow that.
      notify.error("Couldn't update follow. Please try again.");
    } else if (mounted.current) {
      onChange?.(!prev);
    }
    setToggling(false);
  };

  return (
    <Button
      type="button"
      data-testid="follow-button"
      aria-pressed={initialLoading ? undefined : following}
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
