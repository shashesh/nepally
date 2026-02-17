import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getConversations, formatRelativeTime } from '@nusa/shared';
import type { ConversationWithParticipant } from '@nusa/shared';
import styles from '../../styles/Messages.module.css';

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<
    ConversationWithParticipant[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    loadConversations();
  }, [user]);

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
              Start a conversation by messaging a post author from the feed.
            </p>
          </div>
        ) : (
          <div className={styles.conversationList}>
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={styles.conversationItem}
              >
                <div className={styles.convAvatar}>
                  {conv.other_user_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className={styles.convContent}>
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
                  {conv.post_title && (
                    <div className={styles.convPostContext}>
                      Re: {conv.post_title}
                    </div>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className={styles.unreadBadge}>
                    {conv.unread_count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
