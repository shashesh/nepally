/**
 * Shared Conversations API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationWithParticipant } from '../types/chat';

/**
 * Get all conversations for a user, with other participant info and post context.
 * Excludes conversations with blocked users.
 */
export async function getConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data?: ConversationWithParticipant[]; error?: Error }> {
  try {
    // Get conversations where user is a participant
    const { data: myParticipations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count')
      .eq('user_id', userId);

    if (partError) throw partError;
    if (!myParticipations || myParticipations.length === 0) {
      return { data: [] };
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);

    // Get conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, last_message, last_message_time, created_at')
      .in('id', conversationIds)
      .order('last_message_time', { ascending: false, nullsFirst: false });

    if (convError) throw convError;

    // Get other participants
    const { data: otherParticipants, error: otherError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, name')
      .in('conversation_id', conversationIds)
      .neq('user_id', userId);

    if (otherError) throw otherError;

    // Check blocked users — exclude conversations with blocked users
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    const blockedUserIds = new Set<string>();
    if (blocks) {
      for (const b of blocks) {
        if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id);
        if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id);
      }
    }

    // Build lookup maps
    const unreadMap = new Map<string, number>();
    for (const p of myParticipations) {
      unreadMap.set(p.conversation_id, p.unread_count);
    }

    const otherMap = new Map<string, { user_id: string; name: string }>();
    if (otherParticipants) {
      for (const op of otherParticipants) {
        otherMap.set(op.conversation_id, {
          user_id: op.user_id,
          name: op.name,
        });
      }
    }

    // Fetch profile photos and trust levels for other participants
    const otherUserIds = Array.from(new Set(
      (otherParticipants || []).map((op) => op.user_id)
    ));
    const userInfoMap = new Map<string, { profile_photo: string | null; trust_level: number }>();
    if (otherUserIds.length > 0) {
      const { data: userProfiles } = await supabase
        .from('users')
        .select('id, profile_photo, trust_level')
        .in('id', otherUserIds);
      if (userProfiles) {
        for (const u of userProfiles) {
          userInfoMap.set(u.id, {
            profile_photo: u.profile_photo,
            trust_level: u.trust_level,
          });
        }
      }
    }

    // Assemble results
    const result: ConversationWithParticipant[] = [];
    for (const conv of conversations || []) {
      const other = otherMap.get(conv.id);
      if (!other) continue;
      if (blockedUserIds.has(other.user_id)) continue;

      const userInfo = userInfoMap.get(other.user_id);
      result.push({
        id: conv.id,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        created_at: conv.created_at,
        other_user_id: other.user_id,
        other_user_name: other.name,
        other_user_photo: userInfo?.profile_photo ?? null,
        other_user_trust_level: userInfo?.trust_level ?? 0,
        unread_count: unreadMap.get(conv.id) || 0,
      });
    }

    return { data: result };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to fetch conversations'),
    };
  }
}

/**
 * Get or create a 1:1 conversation between two users
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  currentUserName: string,
  otherUserId: string,
  otherUserName: string
): Promise<{ data?: { conversationId: string }; error?: Error }> {
  try {
    // Find conversations the current user participates in
    const { data: myConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (myConversations && myConversations.length > 0) {
      const myConvIds = myConversations.map((c) => c.conversation_id);

      // Find conversations where the other user is also a participant
      const { data: sharedConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds);

      if (sharedConversations && sharedConversations.length > 0) {
        // Return the existing conversation between this user pair
        return { data: { conversationId: sharedConversations[0].conversation_id } };
      }
    }

    // No existing conversation found — create new one.
    // creator_id is set so the SELECT policy allows the creator to read the
    // new row back before any conversation_participants rows exist.
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ creator_id: currentUserId })
      .select()
      .single();

    if (convError) throw convError;

    // Add current user first (passes RLS: user_id = auth.uid())
    const { error: selfPartError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: newConv.id,
        user_id: currentUserId,
        name: currentUserName,
      });

    if (selfPartError) throw selfPartError;

    // Then add other user
    const { error: otherPartError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: newConv.id,
        user_id: otherUserId,
        name: otherUserName,
      });

    if (otherPartError) throw otherPartError;

    return { data: { conversationId: newConv.id } };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to create conversation'),
    };
  }
}

/**
 * Block a user
 */
export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to block user'),
    };
  }
}

/**
 * Check if either user has blocked the other
 */
export async function isBlocked(
  supabase: SupabaseClient,
  userId1: string,
  userId2: string
): Promise<{ blocked: boolean; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(
        `and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`
      )
      .limit(1);

    if (error) throw error;
    return { blocked: (data?.length || 0) > 0 };
  } catch (error) {
    return {
      blocked: false,
      error: error instanceof Error
        ? error
        : new Error('Failed to check block status'),
    };
  }
}
