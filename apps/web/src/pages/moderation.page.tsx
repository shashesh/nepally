import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getPendingPosts,
  listReports,
  resolveReport,
  setPostModerationStatus,
  setUserBanStatus,
  getPostById,
  formatPublicName,
  formatRelativeTime,
} from '@nepally/shared';
import type {
  Post,
  ReportWithUsers,
  ResolveReportInput,
  ModerationPostStatus,
} from '@nepally/shared';
import styles from '../styles/Moderation.module.css';

const DESCRIPTION_PREVIEW_CHARS = 280;

function authorName(post: Post | undefined): string {
  return post?.author?.full_name ? formatPublicName(post.author.full_name) : 'Unknown author';
}

function preview(text: string): string {
  return text.length > DESCRIPTION_PREVIEW_CHARS
    ? `${text.slice(0, DESCRIPTION_PREVIEW_CHARS)}…`
    : text;
}

function showError(error: Error): void {
  notifications.show({ message: error.message, color: 'red' });
}

export default function ModerationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isModerator = Boolean(user?.is_moderator);

  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<ReportWithUsers[]>([]);
  const [reportedPosts, setReportedPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const loadQueue = useCallback(async () => {
    setLoading(true);

    const [postsResult, reportsResult] = await Promise.all([
      getPendingPosts(supabase),
      listReports(supabase, { status: 'pending' }),
    ]);

    const loadError = postsResult.error ?? reportsResult.error;
    if (loadError) showError(loadError);

    const nextReports = reportsResult.data ?? [];
    setPendingPosts(postsResult.data ?? []);
    setReports(nextReports);

    // Reported posts are fetched so the queue can show the title and author
    // (and offer "Ban author") without leaving the page.
    const postIds = Array.from(
      new Set(nextReports.filter((r) => r.target_type === 'post').map((r) => r.target_id))
    );
    const fetched = await Promise.all(
      postIds.map(async (id) => [id, (await getPostById(supabase, id)).data] as const)
    );
    setReportedPosts(
      Object.fromEntries(fetched.filter(([, post]) => Boolean(post)).map(([id, post]) => [id, post as Post]))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isModerator) {
      void loadQueue();
    }
  }, [isModerator, loadQueue]);

  async function decidePost(post: Post, status: ModerationPostStatus): Promise<void> {
    setBusyId(post.id);
    const { error } = await setPostModerationStatus(supabase, post.id, status);
    setBusyId(null);

    if (error) {
      showError(error);
      return;
    }

    setPendingPosts((prev) => prev.filter((p) => p.id !== post.id));
    notifications.show({
      message: status === 'active' ? 'Post approved and published.' : 'Post removed.',
    });
  }

  /** Resolves the report and drops it from the queue. Returns false on error. */
  async function closeReport(report: ReportWithUsers, input: ResolveReportInput): Promise<boolean> {
    const { error } = await resolveReport(supabase, report.id, input);
    if (error) {
      showError(error);
      return false;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    return true;
  }

  async function dismissReport(report: ReportWithUsers): Promise<void> {
    if (!user) return;
    setBusyId(report.id);
    const ok = await closeReport(report, { status: 'dismissed', reviewed_by: user.id, action: 'none' });
    setBusyId(null);
    if (ok) notifications.show({ message: 'Report dismissed.' });
  }

  async function removeReportedPost(report: ReportWithUsers): Promise<void> {
    if (!user) return;
    setBusyId(report.id);

    const { error } = await setPostModerationStatus(supabase, report.target_id, 'removed');
    if (error) {
      showError(error);
      setBusyId(null);
      return;
    }

    const ok = await closeReport(report, { status: 'actioned', reviewed_by: user.id, action: 'removed' });
    setBusyId(null);
    if (ok) notifications.show({ message: 'Post removed and report closed.' });
  }

  async function banUser(report: ReportWithUsers, targetUserId: string, label: string): Promise<void> {
    if (!user) return;
    const confirmed = window.confirm(
      `Ban ${label}? Their posts will be removed and they will no longer be able to post.`
    );
    if (!confirmed) return;

    setBusyId(report.id);

    const { error } = await setUserBanStatus(supabase, targetUserId, true, report.reason);
    if (error) {
      showError(error);
      setBusyId(null);
      return;
    }

    const ok = await closeReport(report, { status: 'actioned', reviewed_by: user.id, action: 'banned' });
    setBusyId(null);
    if (ok) notifications.show({ message: `${label} has been banned.` });
  }

  if (authLoading || !user) return null;

  if (!isModerator) {
    return (
      <>
        <Head>
          <title>Moderation - Nepally</title>
        </Head>
        <div className={styles.shell}>
          <h1 className={styles.title}>Moderation</h1>
          <p className={styles.notice}>Moderator access is required to view this page.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Moderation - Nepally</title>
      </Head>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>Moderation</h1>
          <p className={styles.subtitle}>Review Emergency submissions and community reports.</p>
        </header>

        {loading ? (
          <Center>
            <Loader size="sm" />
          </Center>
        ) : (
          <>
            <section className={styles.section} aria-labelledby="pending-posts-heading">
              <div className={styles.sectionHeader}>
                <h2 id="pending-posts-heading" className={styles.sectionTitle}>
                  Pending posts
                </h2>
                <span className={styles.count}>{pendingPosts.length}</span>
              </div>

              {pendingPosts.length === 0 ? (
                <p className={styles.empty}>No posts waiting for review.</p>
              ) : (
                pendingPosts.map((post) => (
                  <article key={post.id} className={`${styles.card} ${styles.cardPending}`}>
                    <h3 className={styles.cardTitle}>
                      <Link href={`/posts/${post.id}`} className={styles.cardTitleLink}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className={styles.meta}>
                      {`by ${authorName(post)} · ${post.location_city}, ${post.location_state} · ${formatRelativeTime(new Date(post.created_at))}`}
                    </p>
                    <p className={styles.body}>{preview(post.description)}</p>
                    {post.tags && post.tags.length > 0 ? (
                      <div className={styles.tagRow}>
                        {post.tags.map((tag) => (
                          <span key={tag.id} className={styles.tag}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className={styles.actions}>
                      <Button
                        size="xs"
                        onClick={() => decidePost(post, 'active')}
                        loading={busyId === post.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        color="red"
                        onClick={() => decidePost(post, 'removed')}
                        disabled={busyId === post.id}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className={styles.section} aria-labelledby="open-reports-heading">
              <div className={styles.sectionHeader}>
                <h2 id="open-reports-heading" className={styles.sectionTitle}>
                  Open reports
                </h2>
                <span className={styles.count}>{reports.length}</span>
              </div>

              {reports.length === 0 ? (
                <p className={styles.empty}>No open reports.</p>
              ) : (
                reports.map((report) => {
                  const reporter = report.reported_by_user?.full_name
                    ? formatPublicName(report.reported_by_user.full_name)
                    : 'a member';
                  const targetPost =
                    report.target_type === 'post' ? reportedPosts[report.target_id] : undefined;
                  const busy = busyId === report.id;

                  return (
                    <article key={report.id} className={`${styles.card} ${styles.cardReport}`}>
                      <span className={styles.reason}>{report.reason}</span>
                      {report.description ? <p className={styles.body}>{report.description}</p> : null}

                      {report.target_type === 'post' && (
                        <>
                          <p className={styles.cardTitle}>{targetPost?.title ?? 'Post no longer available'}</p>
                          <Link href={`/posts/${report.target_id}`} className={styles.targetLink}>
                            View post
                          </Link>
                        </>
                      )}
                      {report.target_type === 'user' && (
                        <Link href={`/users/${report.target_id}`} className={styles.targetLink}>
                          View user
                        </Link>
                      )}
                      {report.target_type === 'message' && (
                        <p className={styles.meta}>
                          Chat message report. Message content is private; follow up with the reporter.
                        </p>
                      )}

                      <p className={styles.meta}>
                        {`Reported by ${reporter} · ${formatRelativeTime(new Date(report.created_at))}`}
                      </p>

                      <div className={styles.actions}>
                        <Button size="xs" variant="default" onClick={() => dismissReport(report)} disabled={busy}>
                          Dismiss
                        </Button>
                        {report.target_type === 'post' && (
                          <Button
                            size="xs"
                            variant="outline"
                            color="red"
                            onClick={() => removeReportedPost(report)}
                            disabled={busy}
                          >
                            Remove post
                          </Button>
                        )}
                        {report.target_type === 'post' && targetPost?.author_id && (
                          <Button
                            size="xs"
                            color="red"
                            onClick={() => banUser(report, targetPost.author_id, authorName(targetPost))}
                            disabled={busy}
                          >
                            Ban author
                          </Button>
                        )}
                        {report.target_type === 'user' && (
                          <Button
                            size="xs"
                            color="red"
                            onClick={() => banUser(report, report.target_id, 'this user')}
                            disabled={busy}
                          >
                            Ban user
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
