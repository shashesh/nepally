import React, { useId } from 'react';
import Link from 'next/link';
import { Anchor, Text, Title } from '@mantine/core';
import { formatPublicName, formatRelativeTime } from '@nepally/shared';
import type { Post, ReportWithUsers } from '@nepally/shared';
import { ModerationActionButton, type ModerationCardBusy } from './ModerationActionButton';
import styles from './moderationCard.module.css';

export interface ReportCardProps extends ModerationCardBusy {
  report: ReportWithUsers;
  /** The reported post, when the report is about a post that still exists. */
  post: Post | undefined;
  now: Date;
  onDismiss: () => void;
  onRemovePost: () => void;
  /** Called with the target's id and display name. */
  onBan: (targetUserId: string, name: string) => void;
}

function ReportTarget({ report, post }: { report: ReportWithUsers; post: Post | undefined }) {
  if (report.target_type === 'post') {
    return (
      <>
        <Text className={styles.target}>{post?.title ?? 'Post no longer available'}</Text>
        <Anchor component={Link} href={`/posts/${report.target_id}`} className={styles.targetLink}>
          View post
        </Anchor>
      </>
    );
  }
  if (report.target_type === 'user') {
    return (
      <Anchor component={Link} href={`/users/${report.target_id}`} className={styles.targetLink}>
        View member
      </Anchor>
    );
  }
  return (
    <Text className={styles.meta}>Chat message report. Message content is private; follow up with the reporter.</Text>
  );
}

/** An open report, headed by its reason, with the actions its target allows. */
export function ReportCard({ report, post, now, busyAction, locked, onDismiss, onRemovePost, onBan }: ReportCardProps) {
  const headingId = useId();
  const reporter = report.reported_by_user?.full_name ? formatPublicName(report.reported_by_user.full_name) : 'a member';
  const busy = { busyAction, locked };
  const isPost = report.target_type === 'post';
  const authorId = isPost ? post?.author_id : undefined;
  const authorName = post?.author?.full_name ? formatPublicName(post.author.full_name) : 'this author';

  return (
    <article className={styles.card} data-kind="report" tabIndex={-1} aria-labelledby={headingId}>
      <Title order={3} id={headingId} className={styles.title}>
        {report.reason}
      </Title>
      {report.description ? <Text className={styles.body}>{report.description}</Text> : null}
      <ReportTarget report={report} post={post} />
      <Text className={styles.meta}>{`Reported by ${reporter} · ${formatRelativeTime(new Date(report.created_at), now)}`}</Text>
      <div className={styles.actions}>
        <ModerationActionButton action="dismiss" onPress={onDismiss} variant="default" {...busy}>
          Dismiss
        </ModerationActionButton>
        {isPost ? (
          <ModerationActionButton action="remove-post" onPress={onRemovePost} variant="outline" color="red" {...busy}>
            Remove post
          </ModerationActionButton>
        ) : null}
        {authorId ? (
          <ModerationActionButton action="ban" onPress={() => onBan(authorId, authorName)} color="red" {...busy}>
            Ban author
          </ModerationActionButton>
        ) : null}
        {report.target_type === 'user' ? (
          <ModerationActionButton action="ban" onPress={() => onBan(report.target_id, 'this member')} color="red" {...busy}>
            Ban user
          </ModerationActionButton>
        ) : null}
      </div>
    </article>
  );
}
