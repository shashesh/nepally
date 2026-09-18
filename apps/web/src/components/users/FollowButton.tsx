import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { followUser, unfollowUser, isFollowing } from '@nepally/shared';
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

  const loading = toggling || !loadedCurrentPair;

  const toggle = async () => {
    if (loading) return;
    setToggling(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);
    if (res.error) setFollowing(prev);
    else onChange?.(!prev);
    setToggling(false);
  };

  return (
    <button
      type="button"
      data-testid="follow-button"
      aria-pressed={following}
      className={`${styles.btn} ${following ? styles.following : styles.follow}`}
      disabled={loading}
      onClick={toggle}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
