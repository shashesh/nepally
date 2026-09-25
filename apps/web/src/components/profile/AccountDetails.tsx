import React, { useId } from 'react';
import { Button } from '@mantine/core';
import type { User } from '@nepally/shared';
import { DetailList, DetailRow } from '../ui';
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

/**
 * Bio, Account Info and Activity — the profile page's About-tab sections: an
 * editable bio up top, then the member's read-only account fields and
 * activity counts. Account Info and Activity are `DetailList`s, as the
 * public profile's About panel is (components/users/AboutPanel). An unset
 * phone has no row: phone sign-in is deferred, so most members have none.
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
        <DetailList divided>
          <DetailRow label="Email">{user.email}</DetailRow>
          {user.phone ? <DetailRow label="Phone">{user.phone}</DetailRow> : null}
          <DetailRow label="ZIP Code">{user.zip_code || NOT_SET}</DetailRow>
          <DetailRow label="Member Since">{formatMemberSince(user.created_at)}</DetailRow>
        </DetailList>
      </section>

      <section aria-labelledby={activityTitleId}>
        <h2 id={activityTitleId} className={styles.title}>Activity</h2>
        <DetailList divided>
          <DetailRow label="Posts">{user.posts_count ?? 0}</DetailRow>
          <DetailRow label="Helpful Votes">{user.helpful_votes_received ?? 0}</DetailRow>
        </DetailList>
      </section>
    </div>
  );
}
