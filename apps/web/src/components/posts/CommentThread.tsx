import React, { useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import { formatRelativeTime, type PostComment, type PostCommentThread } from '@nepally/shared';
import Avatar from '../Avatar';
import { UserMenuTrigger } from '../users/UserMenuTrigger';
import { useConfirm } from '../ui';
import styles from './CommentThread.module.css';

export interface CommentThreadProps {
  thread: PostCommentThread;
  currentUserId?: string;
  onReply: (parentId: string, authorName: string) => void;
  onDelete: (commentId: string) => Promise<void> | void;
  /** Omit to hide Chat in the author menus. */
  onChat?: (userId: string, name: string) => void;
}

/** One parent comment and its replies, which stay collapsed until asked for. */
export function CommentThread({ thread, currentUserId, onReply, onDelete, onChat }: CommentThreadProps) {
  const [repliesShown, setRepliesShown] = useState(false);
  const confirm = useConfirm();

  async function handleDelete(commentId: string) {
    const shouldDelete = await confirm({
      title: 'Delete comment',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (shouldDelete) await onDelete(commentId);
  }

  function renderComment(comment: PostComment, isReply: boolean) {
    const authorName = comment.author?.full_name || 'Anonymous';
    const isOwn = comment.author_id === currentUserId;
    // Without a joined author there is no member to open: the profile link and
    // Chat would point at a row that is not there.
    const hasMenu = Boolean(comment.author) && !isOwn;

    return (
      <div className={isReply ? styles.reply : styles.comment} key={comment.id}>
        {hasMenu ? (
          <UserMenuTrigger
            userId={comment.author_id}
            name={authorName}
            photoUrl={comment.author?.profile_photo}
            trustLevel={comment.author?.trust_level}
            size="small"
            onChat={onChat}
          />
        ) : (
          <Avatar
            name={authorName}
            photoUrl={comment.author?.profile_photo}
            trustLevel={comment.author?.trust_level}
            size="small"
            decorative
          />
        )}

        <div className={styles.body}>
          <div className={styles.byline}>
            <span className={styles.author}>{authorName}</span>
            <time className={styles.time} dateTime={comment.created_at}>
              {formatRelativeTime(new Date(comment.created_at))}
            </time>
          </div>

          <p className={styles.text}>{comment.content}</p>

          <div className={styles.actions}>
            {!isReply && (
              <UnstyledButton className={styles.action} onClick={() => onReply(comment.id, authorName)}>
                Reply
              </UnstyledButton>
            )}

            {!isReply && thread.replies.length > 0 && (
              <UnstyledButton
                className={styles.action}
                onClick={() => setRepliesShown((shown) => !shown)}
                aria-expanded={repliesShown}
              >
                {repliesShown ? 'Hide replies' : `Show replies (${thread.replies.length})`}
              </UnstyledButton>
            )}

            {isOwn && (
              <UnstyledButton
                className={`${styles.action} ${styles.danger}`}
                onClick={() => void handleDelete(comment.id)}
                aria-label="Delete comment"
              >
                Delete
              </UnstyledButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {renderComment(thread.parent, false)}
      {repliesShown && <div className={styles.replies}>{thread.replies.map((reply) => renderComment(reply, true))}</div>}
    </div>
  );
}
