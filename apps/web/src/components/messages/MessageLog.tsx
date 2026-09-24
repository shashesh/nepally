import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { VisuallyHidden } from '@mantine/core';
import { IconCheck, IconChecks } from '@tabler/icons-react';
import { buildThreadDays, formatDayLabel, formatPublicName, formatRelativeTime } from '@nepally/shared';
import type { ChatMessage, ConversationWithParticipant } from '@nepally/shared';
import Avatar from '../Avatar';
import { useNow } from '../../hooks/useNow';
import styles from './MessageLog.module.css';

/** How close to the bottom still counts as "following along" for an incoming message. */
const FOLLOW_THRESHOLD_PX = 120;

export interface MessageLogProps {
  messages: ChatMessage[];
  viewerId: string;
  partner: ConversationWithParticipant;
}

function isNearBottom(): boolean {
  const root = document.documentElement;
  return root.scrollHeight - window.scrollY - window.innerHeight <= FOLLOW_THRESHOLD_PX;
}

/**
 * The thread, as a polite live region that announces new messages only
 * (not a receipt turning to Read, or a time ticking over). The window
 * scrolls, not this element: it scrolls to the end of the page on first
 * render, after the viewer sends, and when one arrives while the viewer is
 * already at the bottom — never while they are reading back. The end of the
 * page, not the last bubble: that puts the sticky composer in its own place
 * below the thread instead of over the newest message, and leaves the page
 * exactly at the bottom, so the next message is followed too.
 */
export function MessageLog({ messages, viewerId, partner }: MessageLogProps) {
  const name = formatPublicName(partner.other_user_name);
  const days = buildThreadDays(messages, viewerId);
  // A ticking clock, so "Today" becomes "Yesterday" at midnight and "just
  // now" ages while the thread stays open. aria-relevant="additions" keeps
  // these text changes from being announced.
  const now = useNow();
  const shownLastIdRef = useRef<string | null>(null);
  // Recorded on scroll, so it describes the page before a new message renders.
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      nearBottomRef.current = isNearBottom();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const last = messages.at(-1);
  useLayoutEffect(() => {
    if (!last || last.id === shownLastIdRef.current) return;
    const isFirst = shownLastIdRef.current === null;
    shownLastIdRef.current = last.id;
    if (isFirst || last.sender_id === viewerId || nearBottomRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
      nearBottomRef.current = true;
    }
  }, [last, viewerId]);

  return (
    <div role="log" aria-label={`Messages with ${name}`} aria-relevant="additions" className={styles.log}>
      {days.map((day) => (
        <section key={day.key} className={styles.day}>
          <h2 className={styles.dayLabel}>{formatDayLabel(new Date(day.timestamp), now)}</h2>
          {day.messages.map(({ message, isOwn, endsRun }) => (
            <div key={message.id} className={styles.row} data-own={isOwn || undefined}>
              {isOwn ? null : (
                <span className={styles.avatarSlot}>
                  {endsRun ? (
                    <Avatar
                      name={name}
                      toneKey={partner.other_user_name}
                      photoUrl={partner.other_user_photo}
                      size="small"
                      decorative
                    />
                  ) : null}
                </span>
              )}
              <div className={styles.bubble} data-message>
                <p className={styles.text}>{message.text}</p>
                <span className={styles.meta}>
                  <span>{formatRelativeTime(new Date(message.timestamp), now)}</span>
                  {isOwn ? (
                    <span className={styles.receipt}>
                      {message.read ? (
                        <IconChecks size={14} aria-hidden="true" />
                      ) : (
                        <IconCheck size={14} aria-hidden="true" />
                      )}
                      <VisuallyHidden>{message.read ? 'Read' : 'Sent'}</VisuallyHidden>
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
