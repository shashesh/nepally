import React from 'react';
import Link from 'next/link';
import { Badge, VisuallyHidden } from '@mantine/core';
import { formatPublicName, formatRelativeTime } from '@nepally/shared';
import type { ConversationWithParticipant } from '@nepally/shared';
import { UserMenuTrigger } from '../users/UserMenuTrigger';
import styles from './ConversationRow.module.css';

export interface ConversationRowProps {
  conversation: ConversationWithParticipant;
}

/**
 * One inbox row: the partner's avatar menu, then a link to the thread. The
 * link sits beside the avatar rather than stretching over the row, so the
 * menu trigger is never under the link's overlay.
 */
export function ConversationRow({ conversation }: ConversationRowProps) {
  const name = formatPublicName(conversation.other_user_name);
  const unread = conversation.unread_count > 0;

  return (
    <li className={styles.root} data-unread={unread || undefined}>
      <UserMenuTrigger
        userId={conversation.other_user_id}
        name={name}
        toneKey={conversation.other_user_name}
        photoUrl={conversation.other_user_photo}
        trustLevel={conversation.other_user_trust_level}
      />
      <Link href={`/messages/${conversation.id}`} className={styles.link}>
        <span className={styles.top}>
          <span className={styles.name}>{name}</span>
          {conversation.last_message_time ? (
            <span className={styles.time}>{formatRelativeTime(new Date(conversation.last_message_time))}</span>
          ) : null}
        </span>
        <span className={styles.bottom}>
          <span className={styles.preview}>{conversation.last_message || 'No messages yet'}</span>
          {unread ? (
            <Badge circle size="lg" className={styles.badge}>
              {conversation.unread_count}{' '}
              <VisuallyHidden>unread</VisuallyHidden>
            </Badge>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
