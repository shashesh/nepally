import React, { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Text, Title } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import type { Post, ReportWithUsers } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { useModerationQueue, type ModerationResult } from '../hooks/useModerationQueue';
import { useNow } from '../hooks/useNow';
import { isFocusStranded } from '../lib/focus';
import { EmptyState, ErrorState, LoadingState, PageHeader, useConfirm } from '../components/ui';
import { notify } from '../components/ui/notify';
import { PendingPostCard } from '../components/moderation/PendingPostCard';
import { ReportCard } from '../components/moderation/ReportCard';
import styles from './moderation.module.css';

type Section = 'pending' | 'reports';

/** A card acted on, so focus can follow once it has left its section. */
interface PendingFocus {
  section: Section;
  cardId: string;
  index: number;
}

const DESCRIPTION = 'Review Emergency submissions and community reports.';

export default function ModerationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;
  return <ModerationView moderatorId={user.is_moderator ? user.id : null} />;
}

interface QueueSectionProps {
  headingId: string;
  title: string;
  count: string;
  emptyText: string;
  isEmpty: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

function QueueSection({ headingId, title, count, emptyText, isEmpty, headingRef, listRef, children }: QueueSectionProps) {
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHeader}>
        {/* tabIndex -1: focus lands here when the section's last card leaves. */}
        <Title order={2} id={headingId} ref={headingRef} tabIndex={-1} className={styles.sectionTitle}>
          {title}
        </Title>
        <Text className={styles.count}>{count}</Text>
      </div>
      {isEmpty ? (
        <Text className={styles.empty}>{emptyText}</Text>
      ) : (
        <div ref={listRef} className={styles.cards}>
          {children}
        </div>
      )}
    </section>
  );
}

function ModerationView({ moderatorId }: { moderatorId: string | null }) {
  const queue = useModerationQueue(moderatorId);
  const confirm = useConfirm();
  const now = useNow();

  const pendingHeadingRef = useRef<HTMLHeadingElement>(null);
  const reportsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingListRef = useRef<HTMLDivElement>(null);
  const reportsListRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);

  const { pendingPosts, reports } = queue;

  // Once the acted-on card has left, and only if focus went with it, focus
  // the card that took its place, then the one before, then the heading.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const ids = pending.section === 'pending' ? pendingPosts.map((p) => p.id) : reports.map((r) => r.id);
    if (ids.includes(pending.cardId)) return;
    pendingFocusRef.current = null;
    if (!isFocusStranded()) return;

    const list = pending.section === 'pending' ? pendingListRef.current : reportsListRef.current;
    const cards = list?.querySelectorAll<HTMLElement>('article') ?? [];
    const heading = pending.section === 'pending' ? pendingHeadingRef.current : reportsHeadingRef.current;
    const target = cards.length > 0 ? cards[Math.min(pending.index, cards.length - 1)] : heading;
    target?.focus();
  }, [pendingPosts, reports]);

  const run = async (focus: PendingFocus, action: () => Promise<ModerationResult>, success: string) => {
    pendingFocusRef.current = focus;
    const result = await action();
    if (result.ok) {
      notify.success(success);
    } else {
      pendingFocusRef.current = null;
      notify.error(result.message);
    }
  };

  const confirmRemoval = (title: string) =>
    confirm({
      title: 'Remove this post?',
      message: `“${title}” will be taken down and won't appear in any feed.`,
      confirmLabel: 'Remove post',
      danger: true,
    });

  const handleApprove = (post: Post, index: number) =>
    run({ section: 'pending', cardId: post.id, index }, () => queue.approvePost(post), 'Post approved and published.');

  const handleRemove = async (post: Post, index: number) => {
    if (!(await confirmRemoval(post.title))) return;
    await run({ section: 'pending', cardId: post.id, index }, () => queue.removePost(post), 'Post removed.');
  };

  const handleDismiss = (report: ReportWithUsers, index: number) =>
    run({ section: 'reports', cardId: report.id, index }, () => queue.dismissReport(report), 'Report dismissed.');

  const handleRemovePost = async (report: ReportWithUsers, index: number) => {
    const title = queue.reportedPosts[report.target_id]?.title ?? 'This post';
    if (!(await confirmRemoval(title))) return;
    await run(
      { section: 'reports', cardId: report.id, index },
      () => queue.removeReportedPost(report),
      'Post removed and report closed.'
    );
  };

  const handleBan = async (report: ReportWithUsers, index: number, targetUserId: string, name: string) => {
    const confirmed = await confirm({
      title: `Ban ${name}?`,
      message: 'Their posts will be removed and they will no longer be able to post.',
      confirmLabel: 'Ban',
      danger: true,
    });
    if (!confirmed) return;
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    await run(
      { section: 'reports', cardId: report.id, index },
      () => queue.banUser(report, targetUserId),
      `${label} has been banned.`
    );
  };

  const locked = queue.busy !== null;
  const busyActionFor = (id: string) => (queue.busy?.id === id ? queue.busy.action : null);

  let body: ReactNode;
  if (!moderatorId) {
    body = (
      <EmptyState
        icon={<IconShieldLock size={40} />}
        title="Moderator access required"
        description="You need moderator access to view this page."
      />
    );
  } else if (queue.loading) {
    body = <LoadingState label="Loading the moderation queue…" />;
  } else if (queue.error) {
    body = <ErrorState message={queue.error} onRetry={queue.reload} />;
  } else {
    body = (
      <>
        <QueueSection
          headingId="pending-posts-heading"
          title="Pending posts"
          count={`${pendingPosts.length} waiting`}
          emptyText="No posts waiting for review."
          isEmpty={pendingPosts.length === 0}
          headingRef={pendingHeadingRef}
          listRef={pendingListRef}
        >
          {pendingPosts.map((post, index) => (
            <PendingPostCard
              key={post.id}
              post={post}
              now={now}
              locked={locked}
              busyAction={busyActionFor(post.id)}
              onApprove={() => void handleApprove(post, index)}
              onRemove={() => void handleRemove(post, index)}
            />
          ))}
        </QueueSection>

        <QueueSection
          headingId="open-reports-heading"
          title="Open reports"
          count={`${reports.length} open`}
          emptyText="No open reports."
          isEmpty={reports.length === 0}
          headingRef={reportsHeadingRef}
          listRef={reportsListRef}
        >
          {reports.map((report, index) => (
            <ReportCard
              key={report.id}
              report={report}
              post={report.target_type === 'post' ? queue.reportedPosts[report.target_id] : undefined}
              now={now}
              locked={locked}
              busyAction={busyActionFor(report.id)}
              onDismiss={() => void handleDismiss(report, index)}
              onRemovePost={() => void handleRemovePost(report, index)}
              onBan={(targetUserId, name) => void handleBan(report, index, targetUserId, name)}
            />
          ))}
        </QueueSection>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Moderation - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader title="Moderation" description={moderatorId ? DESCRIPTION : undefined} />
        {body}
      </div>
    </>
  );
}
