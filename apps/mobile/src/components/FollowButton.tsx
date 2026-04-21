import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { followUser, unfollowUser, isFollowing } from '@nepally/shared';

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
    <TouchableOpacity
      testID="follow-button"
      style={[styles.btn, following ? styles.btnFollowing : styles.btnFollow]}
      onPress={toggle}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={following ? '#111' : '#fff'} />
      ) : (
        <Text style={[styles.label, following ? styles.labelFollowing : styles.labelFollow]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFollow: { backgroundColor: '#c8102e' },
  btnFollowing: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  label: { fontSize: 14, fontWeight: '600' },
  labelFollow: { color: '#fff' },
  labelFollowing: { color: '#111' },
});
