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
  const [loading, setLoading] = useState<boolean>(true);
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    if (!viewerId || viewerId === targetUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await isFollowing(supabase, viewerId, targetUserId);
      if (!cancelled) {
        setFollowing(Boolean(res.data));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewerId, targetUserId]);

  if (!viewerId || viewerId === targetUserId) return null;

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);
    if (res.error) setFollowing(prev);
    else onChange?.(!prev);
    setLoading(false);
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
