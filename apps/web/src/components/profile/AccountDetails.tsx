import React, { type ReactNode } from 'react';
import type { User } from '@nepally/shared';
import styles from './AccountDetails.module.css';

export interface AccountDetailsProps {
  user: Pick<
    User,
    'bio' | 'email' | 'phone' | 'zip_code' | 'created_at' | 'posts_count' | 'helpful_votes_received'
  >;
}

const NOT_SET = 'Not set';

/**
 * Long-form date (e.g. "March 15, 2024"). `@nepally/shared`'s `formatDate`
 * only produces the short "Mar 5, 2026" form, so this stays local rather
 * than growing a second shared date formatter for one caller.
 */
function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

/**
 * Bio, Account Info and Activity — the profile page's About-tab sections
 * (Task 6.15; replaces profile.page.tsx's former inline markup at lines
 * 720-771). Account Info and Activity mirror the public profile's About
 * panel: an h2 over a <dl> of label/value rows. Bio is prose rather than a
 * label/value pair, so it renders as a paragraph under its own h2 instead.
 */
export function AccountDetails({ user }: AccountDetailsProps) {
  return (
    <>
      <section className={styles.section} aria-labelledby="account-bio-title">
        <h2 id="account-bio-title" className={styles.title}>Bio</h2>
        <p className={styles.bio}>
          {user.bio || 'No bio set. Tap the menu → Edit Bio to add one.'}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="account-info-title">
        <h2 id="account-info-title" className={styles.title}>Account Info</h2>
        <dl className={styles.list}>
          <DetailRow label="Email">{user.email}</DetailRow>
          <DetailRow label="Phone">{user.phone || NOT_SET}</DetailRow>
          <DetailRow label="ZIP Code">{user.zip_code || NOT_SET}</DetailRow>
          <DetailRow label="Member Since">{formatMemberSince(user.created_at)}</DetailRow>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="account-activity-title">
        <h2 id="account-activity-title" className={styles.title}>Activity</h2>
        <dl className={styles.list}>
          <DetailRow label="Posts">{user.posts_count || 0}</DetailRow>
          <DetailRow label="Helpful Votes">{user.helpful_votes_received || 0}</DetailRow>
        </dl>
      </section>
    </>
  );
}
