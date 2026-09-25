import React, { type ReactElement } from 'react';
import type { PublicUser } from '@nepally/shared';
import { DetailList, DetailRow, TrustBadge } from '../ui';
import styles from './AboutPanel.module.css';

export interface AboutPanelProps {
  profileUser: PublicUser;
  metroName: string | null;
  postCount: number;
  eventCount: number;
  listingCount: number;
}

/** The public profile's About tab: bio, location, member since and trust, then activity counts. */
export function AboutPanel({ profileUser, metroName, postCount, eventCount, listingCount }: AboutPanelProps): ReactElement {
  return (
    <div className={styles.root}>
      <DetailList>
        {profileUser.bio && (
          <div className={styles.bioBlock}>
            <dt className={styles.bioLabel}>Bio</dt>
            <dd className={styles.bio}>{profileUser.bio}</dd>
          </div>
        )}
        <DetailRow label="Location">{metroName || 'Not set'}</DetailRow>
        <DetailRow label="Member since">{new Date(profileUser.created_at).getFullYear()}</DetailRow>
        <DetailRow label="Trust level">
          <TrustBadge level={profileUser.trust_level} />
        </DetailRow>
      </DetailList>
      <div className={styles.divider} aria-hidden="true" />
      <DetailList>
        <DetailRow label="Posts">{postCount}</DetailRow>
        <DetailRow label="Events organized">{eventCount}</DetailRow>
        <DetailRow label="Active listings">{listingCount}</DetailRow>
      </DetailList>
    </div>
  );
}
