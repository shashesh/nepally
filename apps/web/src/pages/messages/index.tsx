import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getConversations, formatRelativeTime } from '@nusa/shared';
import type { ConversationWithParticipant } from '@nusa/shared';
import Avatar from '../../components/Avatar';
import styles from '../../styles/Messages.module.css';

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<
    ConversationWithParticipant[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openAvatarMenuId, setOpenAvatarMenuId] = useState<string | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    loadConversations();
  }, [user]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setOpenAvatarMenuId(null);
      }
    }
    if (openAvatarMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openAvatarMenuId]);

  async function loadConversations() {
    if (!user) return;
    setLoading(true);
    const result = await getConversations(supabase, user.id);
    if (result.data) {
      setConversations(result.data);
    }
    setLoading(false);
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Messages - NUSA</title>
      </Head>
      <div className={styles.messagesPage}>
        <h1 className={styles.pageTitle}>Messages</h1>

        {loading ? (
          <div className={styles.loading}>Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h3>No messages yet</h3>
            <p>
              Tap any user's avatar on a post to start chatting.
            </p>
          </div>
        ) : (
          <div className={styles.conversationList}>
            {conversations.map((conv) => (
              <div key={conv.id} className={styles.conversationItem}>
                {/* Avatar with View Profile dropdown */}
                <div
                  className={styles.avatarMenuWrapper}
                  ref={openAvatarMenuId === conv.id ? avatarMenuRef : undefined}
                >
                  <button
                    type="button"
                    className={styles.avatarMenuBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenAvatarMenuId(openAvatarMenuId === conv.id ? null : conv.id);
                    }}
                    aria-label="User options"
                  >
                    <Avatar
                      name={conv.other_user_name || '?'}
                      photoUrl={conv.other_user_photo}
                      trustLevel={conv.other_user_trust_level}
                      size="medium"
                    />
                  </button>
                  {openAvatarMenuId === conv.id && (
                    <div className={styles.avatarDropdown}>
                      <button
                        type="button"
                        className={styles.avatarDropdownItem}
                        onClick={() => {
                          setOpenAvatarMenuId(null);
                          alert('User profiles will be available in a future update.');
                        }}
                      >
                        👤 View Profile
                      </button>
                    </div>
                  )}
                </div>

                {/* Conversation content (navigates to thread) */}
                <Link
                  href={`/messages/${conv.id}`}
                  className={styles.convContent}
                >
                  <div className={styles.convHeader}>
                    <span className={styles.convName}>
                      {conv.other_user_name}
                    </span>
                    <span className={styles.convTime}>
                      {conv.last_message_time
                        ? formatRelativeTime(new Date(conv.last_message_time))
                        : ''}
                    </span>
                  </div>
                  <div
                    className={`${styles.convMessage} ${
                      conv.unread_count > 0 ? styles.convUnreadMessage : ''
                    }`}
                  >
                    {conv.last_message || 'No messages yet'}
                  </div>
                </Link>

                {conv.unread_count > 0 && (
                  <span className={styles.unreadBadge}>
                    {conv.unread_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
