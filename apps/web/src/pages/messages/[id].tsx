import React, { useEffect, useState, useRef, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getMessages,
  sendMessage,
  markAsRead,
  subscribeToMessages,
  formatRelativeTime,
} from '@nusa/shared';
import type { ChatMessage } from '@nusa/shared';
import styles from '../../styles/Messages.module.css';

export default function MessageThreadPage() {
  const router = useRouter();
  const { id: conversationId } = router.query;
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!conversationId || typeof conversationId !== 'string') return;

    loadMessages(conversationId);
    markAsRead(supabase, conversationId, user.id);

    // Subscribe to real-time messages
    const channel = subscribeToMessages(
      supabase,
      conversationId,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read if we're viewing the conversation
        if (newMsg.sender_id !== user.id) {
          markAsRead(supabase, conversationId, user.id);
        }
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(convId: string) {
    setLoading(true);
    setLoadError(null);
    const result = await getMessages(supabase, convId, 100);
    if (result.data) {
      setMessages(result.data);
    } else {
      setLoadError('Could not load messages. Please try again.');
    }
    setLoading(false);
  }

  function handleRetryLoad() {
    if (!conversationId || typeof conversationId !== 'string') return;
    loadMessages(conversationId);
  }

  function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const threadItems: Array<
    | { type: 'date'; id: string; timestamp: string }
    | { type: 'message'; id: string; message: ChatMessage }
  > = [];
  let lastDateKey = '';

  for (const message of messages) {
    const dateKey = new Date(message.timestamp).toDateString();
    if (dateKey !== lastDateKey) {
      threadItems.push({
        type: 'date',
        id: `date-${dateKey}`,
        timestamp: message.timestamp,
      });
      lastDateKey = dateKey;
    }

    threadItems.push({ type: 'message', id: message.id, message });
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (
      !user ||
      !conversationId ||
      typeof conversationId !== 'string' ||
      !text.trim()
    )
      return;

    setSending(true);
    const result = await sendMessage(
      supabase,
      conversationId,
      user.id,
      text.trim()
    );
    setSending(false);

    if (result.data) {
      setText('');
      // The realtime subscription will add it, but add immediately for responsiveness
      setMessages((prev) => {
        if (prev.find((m) => m.id === result.data!.id)) return prev;
        return [...prev, result.data!];
      });
    }
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Chat - NUSA</title>
      </Head>
      <div className={styles.threadPage}>
        <div className={styles.threadHeader}>
          <Link href="/messages" className={styles.threadBackLink}>
            ← Back
          </Link>
          <span className={styles.threadName}>Conversation</span>
        </div>

        <div className={styles.messageList}>
          {loading ? (
            <div className={styles.loading}>Loading messages...</div>
          ) : loadError ? (
            <div className={styles.threadErrorState}>
              <div className={styles.threadErrorIcon}>⚠️</div>
              <p>{loadError}</p>
              <button type="button" className={styles.retryBtn} onClick={handleRetryLoad}>
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No messages yet. Say hello!</p>
            </div>
          ) : (
            threadItems.map((item) => {
              if (item.type === 'date') {
                return (
                  <div key={item.id} className={styles.dateSeparator}>
                    <span>{formatDateLabel(item.timestamp)}</span>
                  </div>
                );
              }

              const msg = item.message;
              const isSent = msg.sender_id === user.id;
              return (
                <div
                  key={msg.id}
                  className={`${styles.messageBubble} ${
                    isSent ? styles.messageSent : styles.messageReceived
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageTime}>
                      {formatRelativeTime(new Date(msg.timestamp))}
                    </span>
                    {isSent && (
                      <span className={styles.readReceipt}>{msg.read ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        <form onSubmit={handleSend} className={styles.messageInputBar}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={styles.messageInput}
            placeholder="Type a message..."
            autoFocus
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={sending || !text.trim()}
          >
            ↑
          </button>
        </form>
      </div>
    </>
  );
}
