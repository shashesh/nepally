import React, { useState } from 'react';
import { Button, TextInput } from '@mantine/core';
import styles from './CommentComposer.module.css';

export interface CommentComposerProps {
  /** Set to show the reply banner and switch the field's label. */
  replyingToName?: string;
  onCancelReply?: () => void;
  /** Throw to report failure: the text is kept so it can be retried. */
  onSubmit: (text: string) => Promise<void> | void;
  submitting?: boolean;
}

/** The comment field under a post. It clears only the text a successful submit sent. */
export function CommentComposer({ replyingToName, onCancelReply, onSubmit, submitting = false }: CommentComposerProps) {
  const [text, setText] = useState('');
  const isReply = Boolean(replyingToName);
  const label = isReply ? 'Write a reply' : 'Write a comment';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    try {
      await onSubmit(trimmed);
    } catch {
      // The caller reports the failure; keeping the text lets them try again.
      return;
    }
    // Clear what was sent, not whatever is there now: anything typed while the
    // request was in flight is the start of the next comment.
    setText((current) => (current.trim() === trimmed ? '' : current));
  }

  return (
    <form onSubmit={handleSubmit} className={styles.root}>
      {isReply && (
        <div className={styles.replyBanner}>
          <span>Replying to {replyingToName}</span>
          <Button variant="subtle" size="compact-sm" onClick={onCancelReply} aria-label="Cancel reply">
            Cancel
          </Button>
        </div>
      )}

      <div className={styles.row}>
        <TextInput
          className={styles.field}
          label={label}
          labelProps={{ className: styles.visuallyHiddenLabel }}
          placeholder={`${label}…`}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <Button type="submit" disabled={!text.trim()} loading={submitting}>
          Post
        </Button>
      </div>
    </form>
  );
}
