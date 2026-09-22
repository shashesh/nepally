import React, { useId, type ReactNode } from 'react';
import { Button } from '@mantine/core';
import type { User } from '@nepally/shared';
import styles from './AccountDetails.module.css';

export interface AccountDetailsProps {
  user: Pick<
    User,
    'bio' | 'email' | 'phone' | 'zip_code' | 'created_at' | 'posts_count' | 'helpful_votes_received'
  >;
  /** Opens the bio editor (useProfileEditing().editBio). */
  onEditBio?: () => void;
  /** useProfileEditing().saving — the button stays focusable but inert while true. */
  editBioBusy?: boolean;
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
 * Bio, Account Info and Activity — the profile page's About-tab sections: an
 * editable bio up top, then the member's read-only account fields and
 * activity counts. Account Info and Activity share the public profile's
 * About panel's dt/dd row styling (`pages/users/[id].page.tsx` AboutPanel).
 * Bio is prose rather than a label/value pair, so it renders as a paragraph
 * under its own h2 instead of a dl row.
 */
export function AccountDetails({ user, onEditBio, editBioBusy }: AccountDetailsProps) {
  const baseId = useId();
  const bioTitleId = `${baseId}-bio-title`;
  const infoTitleId = `${baseId}-info-title`;
  const activityTitleId = `${baseId}-activity-title`;

  // Trim only decides whether there's real content; the bio itself renders
  // as the member wrote it (see the DetailRow-free <p> below).
  const hasBio = Boolean(user.bio?.trim());

  return (
    <div className={styles.root}>
      <section aria-labelledby={bioTitleId}>
        <h2 id={bioTitleId} className={styles.title}>Bio</h2>
        {hasBio ? (
          <p className={styles.bio}>{user.bio}</p>
        ) : (
          <p className={styles.bioEmpty}>No bio yet.</p>
        )}
        {onEditBio && (
          <Button
            variant={hasBio ? 'subtle' : 'light'}
            size="compact-sm"
            className={styles.bioButton}
            aria-disabled={editBioBusy || undefined}
            data-disabled={editBioBusy || undefined}
            onClick={editBioBusy ? undefined : onEditBio}
          >
            {hasBio ? 'Edit bio' : 'Add a bio'}
          </Button>
        )}
      </section>

      <section aria-labelledby={infoTitleId}>
        <h2 id={infoTitleId} className={styles.title}>Account Info</h2>
        <dl className={styles.list}>
          <DetailRow label="Email">{user.email}</DetailRow>
          <DetailRow label="Phone">{user.phone || NOT_SET}</DetailRow>
          <DetailRow label="ZIP Code">{user.zip_code || NOT_SET}</DetailRow>
          <DetailRow label="Member Since">{formatMemberSince(user.created_at)}</DetailRow>
        </dl>
      </section>

      <section aria-labelledby={activityTitleId}>
        <h2 id={activityTitleId} className={styles.title}>Activity</h2>
        <dl className={styles.list}>
          <DetailRow label="Posts">{user.posts_count ?? 0}</DetailRow>
          <DetailRow label="Helpful Votes">{user.helpful_votes_received ?? 0}</DetailRow>
        </dl>
      </section>
    </div>
  );
}
